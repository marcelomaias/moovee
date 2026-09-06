import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveSuggestion, suggestMovie } from "@/app/rooms/actions";
import { db } from "@/lib/db/client";
import {
  queueEntry,
  room,
  roomMember,
  suggestion,
  suggestionVote,
} from "@/lib/rooms/schema";
import { and, eq, sql } from "drizzle-orm";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

const { sessionHeadersMock } = vi.hoisted(() => ({
  sessionHeadersMock: { value: new Headers() },
}));

vi.mock("next/headers", () => ({
  headers: async () => sessionHeadersMock.value,
}));

vi.mock("next/navigation", () => ({
  redirect: () => {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

vi.mock("@/lib/tmdb/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tmdb/client")>();
  return {
    ...actual,
    getMovieDetails: async (id: number) => ({
      id,
      title: `Movie ${id}`,
      overview: "text",
      poster_path: "/poster.jpg",
      backdrop_path: null,
      release_date: "2020-05-01",
      vote_average: 7,
      vote_count: 10,
      popularity: 1,
      genres: [],
      runtime: 90,
      tagline: "",
      status: "Released",
      credits: { cast: [], crew: [] },
    }),
  };
});

async function signedInUser(prefix: string) {
  const u = await createUser(makeTestUser(`sugg-${prefix}`, "user"));
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
  return u;
}

async function createRoomWith(
  owner: { id: string },
  members: { id: string }[] = [],
) {
  const id = `room-${crypto.randomUUID()}`;
  await db.insert(room).values({ id, name: "Suggestions Room", ownerId: owner.id });
  await db.insert(roomMember).values({
    id: crypto.randomUUID(),
    roomId: id,
    userId: owner.id,
    role: "owner",
  });
  for (const m of members) {
    await db.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId: id,
      userId: m.id,
      role: "member",
    });
  }
  return id;
}

describe("suggestions flow", () => {
  async function cleanupRoom(roomId: string) {
    await db.delete(room).where(eq(room.id, roomId));
  }

  it("a lone-member room instantly approves its own suggestion into the queue", async () => {
    const owner = await signedInUser("lone");
    const roomId = await createRoomWith(owner);

    await suggestMovie(roomId, 999);

    const [sug] = await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.roomId, roomId), eq(suggestion.tmdbId, 999)))
      .limit(1);
    expect(sug?.status).toBe("approved");
    expect(sug?.title).toBe("Movie 999");

    const [entry] = await db
      .select()
      .from(queueEntry)
      .where(and(eq(queueEntry.roomId, roomId), eq(queueEntry.tmdbId, 999)))
      .limit(1);
    expect(entry?.position).toBe(1);
    expect(entry?.sourceSuggestionId).toBe(sug?.id);

    await cleanupRoom(roomId);
  });

  it("blocks a duplicate pending suggestion", async () => {
    const owner = await signedInUser("dup");
    const roomId = await createRoomWith(owner);

    await suggestMovie(roomId, 1001);
    const result = await suggestMovie(roomId, 1001);
    expect(result).toEqual({ error: "This movie is already in the queue." });

    const pending = await db
      .select({ id: suggestion.id })
      .from(suggestion)
      .where(
        and(eq(suggestion.roomId, roomId), eq(suggestion.status, "pending")),
      );
    expect(pending).toHaveLength(0);

    await cleanupRoom(roomId);
  });

  it("requires both members in a 2-person room, then queues on the second vote", async () => {
    const owner = await signedInUser("two-a");
    const member = await createUser(makeTestUser("sugg-two-b", "user"));
    const roomId = await createRoomWith(owner, [member]);

    await suggestMovie(roomId, 1002);
    const [sug] = await db
      .select()
      .from(suggestion)
      .where(eq(suggestion.tmdbId, 1002))
      .limit(1);
    expect(sug?.status).toBe("pending");

    sessionHeadersMock.value = await getSessionHeaders(member.email, member.password);
    await approveSuggestion(roomId, sug!.id);

    const [after] = await db.select().from(suggestion).where(eq(suggestion.id, sug!.id));
    expect(after?.status).toBe("approved");

    const [entry] = await db
      .select()
      .from(queueEntry)
      .where(and(eq(queueEntry.roomId, roomId), eq(queueEntry.tmdbId, 1002)))
      .limit(1);
    expect(entry?.position).toBe(1);

    await cleanupRoom(roomId);
  });

  it("double-approving is a no-op", async () => {
    const owner = await signedInUser("twice");
    const member = await createUser(makeTestUser("sugg-twice-b", "user"));
    const roomId = await createRoomWith(owner, [member]);

    await suggestMovie(roomId, 1003);
    const [sug] = await db.select().from(suggestion).where(eq(suggestion.tmdbId, 1003)).limit(1);
    sessionHeadersMock.value = await getSessionHeaders(member.email, member.password);
    await approveSuggestion(roomId, sug!.id);
    await approveSuggestion(roomId, sug!.id);

    const [{ value: count }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(suggestionVote)
      .where(eq(suggestionVote.suggestionId, sug!.id));
    expect(count).toBe(2);

    await cleanupRoom(roomId);
  });
});