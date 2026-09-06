"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/permissions";
import {
  room,
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
  const [inHistory] = await db
    .select({ id: watchHistory.id })
    .from(watchHistory)
    .where(and(eq(watchHistory.roomId, roomId), eq(watchHistory.tmdbId, tmdbId)))
    .limit(1);

  if (dupPending) return { error: "This movie is already suggested." };
  if (inQueue) return { error: "This movie is already in the queue." };
  if (inHistory) return { error: "This movie is already in history." };

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