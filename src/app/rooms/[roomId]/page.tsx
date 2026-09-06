import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireRoomMember } from "@/lib/rooms/auth";
import { db } from "@/lib/db/client";
import {
  roomMember,
  suggestion,
  suggestionVote,
} from "@/lib/rooms/schema";
import { finalizeExpired } from "@/lib/rooms/approval";
import { SuggestionList } from "@/components/rooms/suggestion-list";
import { SuggestMovieDialog } from "@/components/rooms/suggest-movie-dialog";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const { session, room } = await requireRoomMember(roomId);
  await finalizeExpired(roomId);

  const [{ value: memberCount }] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(roomMember)
    .where(eq(roomMember.roomId, roomId));

  const pending = await db
    .select()
    .from(suggestion)
    .where(and(eq(suggestion.roomId, roomId), eq(suggestion.status, "pending")))
    .orderBy(desc(suggestion.suggestedAt));

  let votes: { suggestionId: string }[] = [];
  let counts: { suggestionId: string; value: number }[] = [];
  if (pending.length > 0) {
    const ids = pending.map((s) => s.id);
    votes = await db
      .select({ suggestionId: suggestionVote.suggestionId })
      .from(suggestionVote)
      .where(
        and(
          inArray(suggestionVote.suggestionId, ids),
          eq(suggestionVote.userId, session.user.id),
        ),
      );
    counts = await db
      .select({
        suggestionId: suggestionVote.suggestionId,
        value: sql<number>`count(*)::int`,
      })
      .from(suggestionVote)
      .where(inArray(suggestionVote.suggestionId, ids))
      .groupBy(suggestionVote.suggestionId);
  }
  const countMap = new Map(counts.map((c) => [c.suggestionId, c.value]));

  const suggestions = pending.map((s) => ({
    id: s.id,
    title: s.title,
    posterPath: s.posterPath,
    releaseYear: s.releaseYear,
    suggestedAt: s.suggestedAt,
    approvals: countMap.get(s.id) ?? 0,
  }));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/rooms"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to rooms
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {room.name}
          </h1>
          {room.description ? (
            <p className="mt-1 text-muted-foreground">{room.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </p>
        </div>
        <SuggestMovieDialog roomId={room.id} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Suggestions</h2>
        <div className="mt-4">
          <SuggestionList
            roomId={room.id}
            suggestions={suggestions}
            memberCount={memberCount}
            myVotes={votes.map((v) => v.suggestionId)}
          />
        </div>
      </section>
    </main>
  );
}