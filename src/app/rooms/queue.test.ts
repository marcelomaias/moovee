import { describe, expect, it, vi } from "vitest";
import {
  markWatched,
  removeHistoryEntry,
  removeQueueEntry,
  reorderQueue,
  suggestMovie,
} from "@/app/rooms/actions";
import { db } from "@/lib/db/client";
import {
  queueEntry,
  room,
  roomMember,
  watchHistory,
} from "@/lib/rooms/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

const { sessionHeadersMock } = vi.hoisted(() => ({
  sessionHeadersMock: { value: new Headers() },
}));

vi.mock("next/headers", () => ({
  headers: async () => sessionHeadersMock.value,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
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

async function signIn(prefix: string) {
  const u = await createUser(makeTestUser(`queue-${prefix}`, "user"));
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
  return u;
}

async function createRoomWith(
  owner: { id: string },
  members: { id: string }[] = [],
) {
  const id = `room-${crypto.randomUUID()}`;
  await db.insert(room).values({ id, name: "Queue Room", ownerId: owner.id });
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

async function seedQueue(roomId: string, tmdbIds: number[]) {
  for (const [i, tmdbId] of tmdbIds.entries()) {
    await db.insert(queueEntry).values({
      id: crypto.randomUUID(),
      roomId,
      tmdbId,
      title: `Movie ${tmdbId}`,
      position: i + 1,
    });
  }
}

async function roomQueue(roomId: string) {
  return db
    .select({ id: queueEntry.id, tmdbId: queueEntry.tmdbId, position: queueEntry.position })
    .from(queueEntry)
    .where(eq(queueEntry.roomId, roomId))
    .orderBy(asc(queueEntry.position));
}

describe("queue & history", () => {
  it("markWatched moves a movie from queue to history", async () => {
    const owner = await signIn("mw-a");
    const roomId = await createRoomWith(owner);
    await seedQueue(roomId, [2001]);

    await markWatched(roomId, (await roomQueue(roomId))[0].id);

    expect(await roomQueue(roomId)).toHaveLength(0);
    const [hist] = await db
      .select()
      .from(watchHistory)
      .where(and(eq(watchHistory.roomId, roomId), eq(watchHistory.tmdbId, 2001)))
      .limit(1);
    expect(hist?.title).toBe("Movie 2001");
    expect(hist?.watchedById).toBe(owner.id);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("markWatched is idempotent under double mark", async () => {
    const owner = await signIn("mw-b");
    const roomId = await createRoomWith(owner);
    await seedQueue(roomId, [2002]);

    const entryId = (await roomQueue(roomId))[0].id;
    await markWatched(roomId, entryId);
    await markWatched(roomId, entryId);

    const [{ value: count }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(watchHistory)
      .where(eq(watchHistory.roomId, roomId));
    expect(count).toBe(1);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("owner reorders the queue, preserving entries", async () => {
    const owner = await signIn("reorder");
    const roomId = await createRoomWith(owner);
    await seedQueue(roomId, [3001, 3002, 3003]);
    const before = await roomQueue(roomId);

    const newOrder = [before[2].id, before[0].id, before[1].id];
    await reorderQueue(roomId, newOrder);

    const after = await roomQueue(roomId);
    expect(after.map((e) => e.tmdbId)).toEqual([3003, 3001, 3002]);
    expect(after.map((e) => e.position)).toEqual([1, 2, 3]);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("rejects an order that isn't exactly the room's entries", async () => {
    const owner = await signIn("reorder-bad");
    const roomId = await createRoomWith(owner);
    await seedQueue(roomId, [3004, 3005]);
    const before = await roomQueue(roomId);

    await reorderQueue(roomId, [before[0].id, "foreign-id"]);
    await reorderQueue(roomId, [before[0].id]);

    const after = await roomQueue(roomId);
    expect(after.map((e) => e.position)).toEqual([1, 2]);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("only the owner can reorder or remove queue entries", async () => {
    const owner = await signIn("owner");
    const member = await createUser(makeTestUser("queue-member", "user"));
    const roomId = await createRoomWith(owner, [member]);
    await seedQueue(roomId, [3006]);
    const entryId = (await roomQueue(roomId))[0].id;

    sessionHeadersMock.value = await getSessionHeaders(member.email, member.password);
    await expect(reorderQueue(roomId, [entryId])).rejects.toThrow(
      "NEXT_REDIRECT:/rooms",
    );
    await expect(removeQueueEntry(roomId, entryId)).rejects.toThrow(
      "NEXT_REDIRECT:/rooms",
    );
    await expect(removeHistoryEntry(roomId, 3006)).rejects.toThrow(
      "NEXT_REDIRECT:/rooms",
    );

    expect(await roomQueue(roomId)).toHaveLength(1);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("removing a queue entry frees the movie for re-suggestion", async () => {
    const owner = await signIn("re-suggest");
    const roomId = await createRoomWith(owner);
    await seedQueue(roomId, [3007]);
    const entryId = (await roomQueue(roomId))[0].id;

    await removeQueueEntry(roomId, entryId);
    await suggestMovie(roomId, 3007);

    const [{ value: count }] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(queueEntry)
      .where(eq(queueEntry.roomId, roomId));
    expect(count).toBe(1);

    await db.delete(room).where(eq(room.id, roomId));
  });
});