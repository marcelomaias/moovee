import { and, eq, lt, max, sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  queueEntry,
  room,
  roomMember,
  suggestion,
  suggestionVote,
  watchHistory,
} from "@/lib/rooms/schema";

export type ApprovalMode = "majority" | "unanimous" | "percentage";

/**
 * Pure threshold check. `A` = approval count, `N` = current active member count.
 * Approval-only — there is no reject path, a suggestion either reaches the
 * threshold or expires.
 */
export function evaluateApproval(
  mode: ApprovalMode,
  threshold: number | null,
  approvals: number,
  memberCount: number,
): boolean {
  switch (mode) {
    case "majority":
      return approvals > memberCount / 2;
    case "unanimous":
      return approvals >= memberCount;
    case "percentage":
      return (
        threshold != null &&
        threshold > 0 &&
        approvals / memberCount >= threshold / 100
      );
  }
}

/** Lazy expiry: a row with `expiresAt` in the past is treated as expired. */
export function isExpired(expiresAt: Date, now: number = Date.now()): boolean {
  return expiresAt.getTime() < now;
}

export type Room = InferSelectModel<typeof room>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Bulk sweep: finalize any pending suggestion past its expiry lazily on read. */
export async function finalizeExpired(roomId: string) {
  await db
    .update(suggestion)
    .set({ status: "expired" })
    .where(
      and(
        eq(suggestion.roomId, roomId),
        eq(suggestion.status, "pending"),
        lt(suggestion.expiresAt, new Date()),
      ),
    );
}

/**
 * Resolve a pending suggestion inside the caller's transaction: expire it if
 * past `expiresAt`, or approve it if the threshold is met (inserting a queue
 * entry at the tail, skipping queues/history duplicates). Serialized per room
 * by a room row lock so concurrent approvals can't double-resolve or collide
 * on queue positions. # ponytail: room-granular lock; switch to suggestion
 * lock + renumber-on-conflict only if a room's approval volume ever matters.
 */
export async function resolveSuggestionIfReady(
  tx: Tx,
  roomRef: Room,
  suggestionId: string,
) {
  await tx
    .select({ id: room.id })
    .from(room)
    .where(eq(room.id, roomRef.id))
    .for("no key update");

  const [sug] = await tx
    .select()
    .from(suggestion)
    .where(
      and(eq(suggestion.id, suggestionId), eq(suggestion.roomId, roomRef.id)),
    )
    .limit(1);
  if (!sug || sug.status !== "pending") return;

  if (isExpired(sug.expiresAt)) {
    await tx
      .update(suggestion)
      .set({ status: "expired" })
      .where(eq(suggestion.id, suggestionId));
    return;
  }

  const [{ value: approvals }] = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(suggestionVote)
    .where(eq(suggestionVote.suggestionId, suggestionId));
  const [{ value: memberCount }] = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(roomMember)
    .where(eq(roomMember.roomId, roomRef.id));

  if (
    !evaluateApproval(
      roomRef.approvalMode as ApprovalMode,
      roomRef.approvalThreshold,
      approvals,
      memberCount,
    )
  ) {
    return;
  }

  const [inQueue] = await tx
    .select({ id: queueEntry.id })
    .from(queueEntry)
    .where(
      and(eq(queueEntry.roomId, roomRef.id), eq(queueEntry.tmdbId, sug.tmdbId)),
    )
    .limit(1);
  const [inHistory] = await tx
    .select({ id: watchHistory.id })
    .from(watchHistory)
    .where(
      and(
        eq(watchHistory.roomId, roomRef.id),
        eq(watchHistory.tmdbId, sug.tmdbId),
      ),
    )
    .limit(1);

  if (!inQueue && !inHistory) {
    const [{ value: maxPosition }] = await tx
      .select({ value: max(queueEntry.position) })
      .from(queueEntry)
      .where(eq(queueEntry.roomId, roomRef.id));
    await tx.insert(queueEntry).values({
      id: crypto.randomUUID(),
      roomId: roomRef.id,
      tmdbId: sug.tmdbId,
      title: sug.title,
      posterPath: sug.posterPath,
      releaseYear: sug.releaseYear,
      position: (maxPosition ?? 0) + 1,
      sourceSuggestionId: suggestionId,
    });
  }

  await tx
    .update(suggestion)
    .set({ status: "approved" })
    .where(eq(suggestion.id, suggestionId));
}