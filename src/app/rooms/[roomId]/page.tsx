import Link from "next/link";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { requireRoomMember } from "@/lib/rooms/auth";
import { db } from "@/lib/db/client";
import { user } from "@/lib/auth/schema";
import {
  queueEntry,
  roomMember,
  suggestion,
  suggestionVote,
  watchHistory,
} from "@/lib/rooms/schema";
import { finalizeExpired } from "@/lib/rooms/approval";
import { getMovie } from "@/lib/tmdb/client";
import { SuggestionList } from "@/components/rooms/suggestion-list";
import { SuggestMovieDialog } from "@/components/rooms/suggest-movie-dialog";
import { QueueHero, type QueueMovie } from "@/components/rooms/queue-hero";
import { QueueList } from "@/components/rooms/queue-list";
import { HistoryList } from "@/components/rooms/history-list";
import { RoomTabs } from "@/components/rooms/room-tabs";
import { InviteMembers } from "@/components/rooms/invite-members";
import { MemberList } from "@/components/rooms/member-list";
import { RoomSettings } from "@/components/rooms/room-settings";

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

  const queueEntries = await db
    .select()
    .from(queueEntry)
    .where(eq(queueEntry.roomId, roomId))
    .orderBy(asc(queueEntry.position));

  const queueMovies: QueueMovie[] = (
    await Promise.allSettled(queueEntries.map((e) => getMovie(e.tmdbId)))
  ).map((result, i) => {
    const e = queueEntries[i];
    return {
      tmdbId: e.tmdbId,
      title: e.title,
      release_date:
        result.status === "fulfilled"
          ? result.value.release_date || e.releaseYear || ""
          : e.releaseYear || "",
      backdropPath:
        result.status === "fulfilled" ? result.value.backdrop_path : null,
      posterPath: e.posterPath,
      tagline: result.status === "fulfilled" ? result.value.tagline : "",
      vote_average:
        result.status === "fulfilled" ? result.value.vote_average : 0,
      runtime: result.status === "fulfilled" ? result.value.runtime : null,
      genres: result.status === "fulfilled" ? result.value.genres : [],
    };
  });

  const history = await db
    .select()
    .from(watchHistory)
    .where(eq(watchHistory.roomId, roomId))
    .orderBy(desc(watchHistory.watchedAt));

  const isOwner = room.ownerId === session.user.id;

  const alreadySuggested = [
    ...pending.map((s) => s.tmdbId),
    ...queueEntries.map((e) => e.tmdbId),
  ];

  const members = isOwner
    ? await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: roomMember.role,
        })
        .from(roomMember)
        .innerJoin(user, eq(roomMember.userId, user.id))
        .where(eq(roomMember.roomId, roomId))
        .orderBy(asc(roomMember.joinedAt))
    : [];

  const tabs = [
    {
      key: "suggestions",
      label: `Suggestions (${suggestions.length})`,
      content: (
        <SuggestionList
          roomId={room.id}
          suggestions={suggestions}
          memberCount={memberCount}
          myVotes={votes.map((v) => v.suggestionId)}
        />
      ),
    },
    {
      key: "queue",
      label: `Queue (${queueEntries.length})`,
      content: (
        <QueueList
          roomId={room.id}
          entries={queueEntries.map((e) => ({
            id: e.id,
            title: e.title,
            posterPath: e.posterPath,
            releaseYear: e.releaseYear,
            position: e.position,
          }))}
          isOwner={isOwner}
        />
      ),
    },
    {
      key: "history",
      label: `History (${history.length})`,
      content: (
        <HistoryList
          roomId={room.id}
          entries={history.map((h) => ({
            id: h.id,
            tmdbId: h.tmdbId,
            title: h.title,
            posterPath: h.posterPath,
            releaseYear: h.releaseYear,
            watchedAt: h.watchedAt,
          }))}
          isOwner={isOwner}
        />
      ),
    },
  ];

  if (isOwner) {
    tabs.push({
      key: "members",
      label: `Members (${members.length})`,
      content: (
        <div className="space-y-8">
          <InviteMembers roomId={room.id} />
          <MemberList
            roomId={room.id}
            members={members}
            currentUserId={session.user.id}
          />
          <section className="rounded-xl border p-6">
            <h2 className="text-lg font-semibold">Approval Rules</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Control how suggestions are approved before they enter the queue.
            </p>
            <div className="mt-6">
              <RoomSettings
                roomId={room.id}
                mode={
                  room.approvalMode as "majority" | "unanimous" | "percentage"
                }
                threshold={room.approvalThreshold}
              />
            </div>
          </section>
        </div>
      ),
    });
  }

  return (
    <main>
      <div className="bg-card">
        <div className="mx-auto max-w-6xl p-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/rooms"
              className="text-base text-muted-foreground hover:text-foreground"
            >
              ← Back to rooms
            </Link>
            <h1 className="mt-1 text-4xl font-bold tracking-tight">
              {room.name}
            </h1>
            {room.description ? (
              <p className="mt-2 text-lg text-muted-foreground">
                {room.description}
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="mb-3 text-sm text-muted-foreground">
              {memberCount} member{memberCount === 1 ? "" : "s"}
              {room.approvalMode === "percentage" && room.approvalThreshold
                ? ` · approval: ${room.approvalThreshold}% of members`
                : ` · approval: ${room.approvalMode}`}
            </p>
            <SuggestMovieDialog
              roomId={room.id}
              alreadySuggested={alreadySuggested}
            />
          </div>
        </div>
      </div>

      {queueMovies.length > 0 ? (
        <section>
          <QueueHero movies={queueMovies} />
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl mt-12">
        <RoomTabs tabs={tabs} />
      </section>
    </main>
  );
}
