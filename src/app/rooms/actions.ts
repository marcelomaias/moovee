"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, like, ne, notInArray, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/permissions";
import { user } from "@/lib/auth/schema";
import {
  room,
  roomInvite,
  roomMember,
  queueEntry,
  suggestion,
  suggestionVote,
  watchHistory,
} from "@/lib/rooms/schema";
import { requireRoomMember, requireRoomOwner } from "@/lib/rooms/auth";
import {
  finalizeExpired,
  resolveSuggestionIfReady,
} from "@/lib/rooms/approval";
import { getMovieDetails } from "@/lib/tmdb/client";

const SUGGESTION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createRoom(
  prevState: { error: string } | null,
  formData: FormData,
) {
  const session = await requireUser();

  const name = formData.get("name");
  const description = formData.get("description");
  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Room name is required." };
  }

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(room).values({
      id,
      name: name.trim(),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      ownerId: session.user.id,
    });
    await tx.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId: id,
      userId: session.user.id,
      role: "owner",
    });
  });

  revalidatePath("/rooms");
  redirect(`/rooms/${id}`);
}

export async function updateRoom(roomId: string, formData: FormData) {
  await requireRoomOwner(roomId);

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: "Room name is required." };
  }
  const description = formData.get("description");

  await db
    .update(room)
    .set({
      name: name.trim(),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
    })
    .where(eq(room.id, roomId));

  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
}

export async function deleteRoom(roomId: string) {
  await requireRoomOwner(roomId);

  await db.delete(room).where(eq(room.id, roomId));

  revalidatePath("/rooms");
  redirect("/rooms");
}

export async function suggestMovie(roomId: string, tmdbId: number) {
  const { session, room: roomRef } = await requireRoomMember(roomId);
  await finalizeExpired(roomId);

  const [dupPending] = await db
    .select({ id: suggestion.id })
    .from(suggestion)
    .where(
      and(
        eq(suggestion.roomId, roomId),
        eq(suggestion.tmdbId, tmdbId),
        eq(suggestion.status, "pending"),
      ),
    )
    .limit(1);
  const [inQueue] = await db
    .select({ id: queueEntry.id })
    .from(queueEntry)
    .where(and(eq(queueEntry.roomId, roomId), eq(queueEntry.tmdbId, tmdbId)))
    .limit(1);

  if (dupPending) return { error: "This movie is already suggested." };
  if (inQueue) return { error: "This movie is already in the queue." };

  const details = await getMovieDetails(tmdbId);
  const suggestionId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(suggestion).values({
      id: suggestionId,
      roomId,
      suggestedById: session.user.id,
      tmdbId,
      title: details.title,
      posterPath: details.poster_path,
      releaseYear: details.release_date
        ? details.release_date.slice(0, 4)
        : null,
      status: "pending",
      expiresAt: new Date(Date.now() + SUGGESTION_TTL_MS),
    });
    await tx.insert(suggestionVote).values({
      id: crypto.randomUUID(),
      suggestionId,
      userId: session.user.id,
    });
    await resolveSuggestionIfReady(tx, roomRef, suggestionId);
  });

  revalidatePath(`/rooms/${roomId}`);
}

export async function markWatched(roomId: string, queueEntryId: string) {
  const { session } = await requireRoomMember(roomId);

  await db.transaction(async (tx) => {
    await tx
      .select({ id: room.id })
      .from(room)
      .where(eq(room.id, roomId))
      .for("no key update");

    const [entry] = await tx
      .select()
      .from(queueEntry)
      .where(
        and(eq(queueEntry.roomId, roomId), eq(queueEntry.id, queueEntryId)),
      )
      .limit(1);
    if (!entry) return;

    await tx
      .insert(watchHistory)
      .values({
        id: crypto.randomUUID(),
        roomId,
        tmdbId: entry.tmdbId,
        title: entry.title,
        posterPath: entry.posterPath,
        releaseYear: entry.releaseYear,
        watchedById: session.user.id,
        sourceQueueEntryId: entry.id,
      })
      .onConflictDoNothing();
    await tx.delete(queueEntry).where(eq(queueEntry.id, entry.id));
  });

  revalidatePath(`/rooms/${roomId}`);
}

export async function reorderQueue(roomId: string, order: string[]) {
  await requireRoomOwner(roomId);

  await db.transaction(async (tx) => {
    await tx
      .select({ id: room.id })
      .from(room)
      .where(eq(room.id, roomId))
      .for("no key update");

    const rows = await tx
      .select()
      .from(queueEntry)
      .where(eq(queueEntry.roomId, roomId));
    const ids = new Set(rows.map((r) => r.id));
    if (
      order.length !== rows.length ||
      order.some((id) => !ids.has(id)) ||
      new Set(order).size !== order.length
    ) {
      return;
    }

    const byId = new Map(rows.map((r) => [r.id, r]));
    await tx.delete(queueEntry).where(eq(queueEntry.roomId, roomId));
    for (const [i, id] of order.entries()) {
      const row = byId.get(id)!;
      await tx.insert(queueEntry).values({ ...row, position: i + 1 });
    }
  });

  revalidatePath(`/rooms/${roomId}`);
}

export async function removeQueueEntry(roomId: string, queueEntryId: string) {
  await requireRoomOwner(roomId);

  await db
    .delete(queueEntry)
    .where(and(eq(queueEntry.roomId, roomId), eq(queueEntry.id, queueEntryId)));

  revalidatePath(`/rooms/${roomId}`);
}

export async function removeHistoryEntry(roomId: string, tmdbId: number) {
  await requireRoomOwner(roomId);

  await db
    .delete(watchHistory)
    .where(and(eq(watchHistory.roomId, roomId), eq(watchHistory.tmdbId, tmdbId)));

  revalidatePath(`/rooms/${roomId}`);
}

export async function searchUsersForInvite(roomId: string, query: string) {
  const { session } = await requireRoomOwner(roomId);
  const q = query.trim();
  if (q.length === 0) return [];

  const memberIds = db
    .select({ id: roomMember.userId })
    .from(roomMember)
    .where(eq(roomMember.roomId, roomId));
  const pendingInviteeIds = db
    .select({ id: roomInvite.invitedUserId })
    .from(roomInvite)
    .where(
      and(eq(roomInvite.roomId, roomId), eq(roomInvite.status, "pending")),
    );

  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(
      and(
        or(like(user.name, `%${q}%`), like(user.email, `%${q}%`)),
        ne(user.id, session.user.id),
        notInArray(user.id, memberIds),
        notInArray(user.id, pendingInviteeIds),
      ),
    )
    .orderBy(user.name)
    .limit(10);
}

export async function inviteToRoom(roomId: string, userId: string) {
  const { session } = await requireRoomOwner(roomId);

  const [membership] = await db
    .select({ id: roomMember.id })
    .from(roomMember)
    .where(and(eq(roomMember.roomId, roomId), eq(roomMember.userId, userId)))
    .limit(1);
  if (membership) return { error: "This user is already a member." };

  await db
    .insert(roomInvite)
    .values({
      id: crypto.randomUUID(),
      roomId,
      invitedUserId: userId,
      invitedById: session.user.id,
      status: "pending",
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    })
    .onConflictDoUpdate({
      target: [roomInvite.roomId, roomInvite.invitedUserId],
      set: {
        status: "pending",
        invitedById: session.user.id,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

  revalidatePath(`/rooms/${roomId}`);
}

export async function acceptInvite(roomId: string) {
  const session = await requireUser();

  const [invite] = await db
    .select()
    .from(roomInvite)
    .where(
      and(
        eq(roomInvite.roomId, roomId),
        eq(roomInvite.invitedUserId, session.user.id),
        eq(roomInvite.status, "pending"),
      ),
    )
    .limit(1);
  if (!invite) return { error: "No pending invitation found." };
  if (invite.expiresAt.getTime() < Date.now()) {
    return {
      error: "This invitation has expired. Ask the owner to invite you again.",
    };
  }

  await db.insert(roomMember).values({
    id: crypto.randomUUID(),
    roomId,
    userId: session.user.id,
    role: "member",
  });
  await db
    .update(roomInvite)
    .set({ status: "accepted" })
    .where(eq(roomInvite.id, invite.id));

  revalidatePath("/account");
  revalidatePath(`/rooms/${roomId}`);
}

export async function declineInvite(roomId: string) {
  const session = await requireUser();

  await db
    .update(roomInvite)
    .set({ status: "declined" })
    .where(
      and(
        eq(roomInvite.roomId, roomId),
        eq(roomInvite.invitedUserId, session.user.id),
        eq(roomInvite.status, "pending"),
      ),
    );

  revalidatePath("/account");
}

export async function removeMember(roomId: string, userId: string) {
  const { session } = await requireRoomOwner(roomId);
  if (userId === session.user.id) {
    return { error: "You cannot remove yourself from the room." };
  }

  await db
    .delete(roomMember)
    .where(and(eq(roomMember.roomId, roomId), eq(roomMember.userId, userId)));

  revalidatePath(`/rooms/${roomId}`);
}

export async function approveSuggestion(roomId: string, suggestionId: string) {
  const { session, room: roomRef } = await requireRoomMember(roomId);
  await finalizeExpired(roomId);

  await db.transaction(async (tx) => {
    await tx
      .insert(suggestionVote)
      .values({
        id: crypto.randomUUID(),
        suggestionId,
        userId: session.user.id,
      })
      .onConflictDoNothing();
    await resolveSuggestionIfReady(tx, roomRef, suggestionId);
  });

  revalidatePath(`/rooms/${roomId}`);
}