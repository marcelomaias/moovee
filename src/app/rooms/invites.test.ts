import { describe, expect, it, vi } from "vitest";
import {
  acceptInvite,
  declineInvite,
  inviteToRoom,
  removeMember,
  searchUsersForInvite,
} from "@/app/rooms/actions";
import { db } from "@/lib/db/client";
import {
  room,
  roomInvite,
  roomMember,
} from "@/lib/rooms/schema";
import { and, eq } from "drizzle-orm";
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

const DAY_MS = 24 * 60 * 60 * 1000;

async function signedInUser(prefix: string) {
  const u = await createUser(makeTestUser(prefix, "user"));
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
  return u;
}

async function signInAs(u: { email: string; password: string }) {
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
}

async function createRoomWith(owner: { id: string }) {
  const id = `room-${crypto.randomUUID()}`;
  await db.insert(room).values({ id, name: "Invite Room", ownerId: owner.id });
  await db.insert(roomMember).values({
    id: crypto.randomUUID(),
    roomId: id,
    userId: owner.id,
    role: "owner",
  });
  return id;
}

async function myInvite(roomId: string, userId: string) {
  const [invite] = await db
    .select()
    .from(roomInvite)
    .where(
      and(eq(roomInvite.roomId, roomId), eq(roomInvite.invitedUserId, userId)),
    )
    .limit(1);
  return invite;
}

describe("invites", () => {
  it("searchUsersForInvite returns matches but excludes self and pending invitees", async () => {
    const owner = await signedInUser("search-owner");
    const invitee = await createUser(makeTestUser("search-target", "user"));
    const roomId = await createRoomWith(owner);

    const found = await searchUsersForInvite(roomId, "search-target");
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(invitee.id);

    const own = await searchUsersForInvite(roomId, "search-owner");
    expect(own).toHaveLength(0);

    await inviteToRoom(roomId, invitee.id);
    const after = await searchUsersForInvite(roomId, "search-target");
    expect(after).toHaveLength(0);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("inviteToRoom creates a pending invite with a 7-day expiry", async () => {
    const owner = await signedInUser("inv-a");
    const invitee = await createUser(makeTestUser("invitee-a", "user"));
    const roomId = await createRoomWith(owner);

    await inviteToRoom(roomId, invitee.id);

    const invite = await myInvite(roomId, invitee.id);
    expect(invite?.status).toBe("pending");
    expect(invite?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * DAY_MS);
    expect(invite?.expiresAt.getTime()).toBeLessThan(Date.now() + 8 * DAY_MS);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("re-inviting after a decline resets the invite to pending with a fresh expiry", async () => {
    const owner = await signedInUser("inv-b");
    const invitee = await createUser(makeTestUser("invitee-b", "user"));
    const roomId = await createRoomWith(owner);

    await inviteToRoom(roomId, invitee.id);
    await signInAs(invitee);
    await declineInvite(roomId);

    const declined = await myInvite(roomId, invitee.id);
    expect(declined?.status).toBe("declined");

    await signInAs(owner);
    await inviteToRoom(roomId, invitee.id);

    const reset = await myInvite(roomId, invitee.id);
    expect(reset?.id).toBe(declined?.id);
    expect(reset?.status).toBe("pending");
    expect(reset?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * DAY_MS);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("inviteToRoom rejects a user who is already a member", async () => {
    const owner = await signedInUser("inv-c");
    const member = await createUser(makeTestUser("already-member", "user"));
    const roomId = await createRoomWith(owner);
    await db.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId,
      userId: member.id,
      role: "member",
    });

    expect(await inviteToRoom(roomId, member.id)).toEqual({
      error: "This user is already a member.",
    });

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("acceptInvite adds membership and marks the invite accepted", async () => {
    const owner = await signedInUser("inv-d");
    const invitee = await createUser(makeTestUser("invitee-d", "user"));
    const roomId = await createRoomWith(owner);
    await inviteToRoom(roomId, invitee.id);

    await signInAs(invitee);
    await acceptInvite(roomId);

    const [membership] = await db
      .select()
      .from(roomMember)
      .where(and(eq(roomMember.roomId, roomId), eq(roomMember.userId, invitee.id)))
      .limit(1);
    expect(membership?.role).toBe("member");
    expect((await myInvite(roomId, invitee.id))?.status).toBe("accepted");

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("acceptInvite on an expired invite fails and adds no membership", async () => {
    const owner = await signedInUser("inv-e");
    const invitee = await createUser(makeTestUser("invitee-e", "user"));
    const roomId = await createRoomWith(owner);
    await db.insert(roomInvite).values({
      id: crypto.randomUUID(),
      roomId,
      invitedUserId: invitee.id,
      invitedById: owner.id,
      status: "pending",
      expiresAt: new Date(Date.now() - DAY_MS),
    });

    await signInAs(invitee);
    const result = await acceptInvite(roomId);
    expect(result?.error).toContain("expired");

    const membership = await db
      .select({ id: roomMember.id })
      .from(roomMember)
      .where(and(eq(roomMember.roomId, roomId), eq(roomMember.userId, invitee.id)))
      .limit(1);
    expect(membership).toHaveLength(0);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("removeMember removes others but never the owner, and is owner-only", async () => {
    const owner = await signedInUser("inv-f");
    const member = await createUser(makeTestUser("removable", "user"));
    const roomId = await createRoomWith(owner);
    await db.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId,
      userId: member.id,
      role: "member",
    });

    expect(await removeMember(roomId, owner.id)).toEqual({
      error: "You cannot remove yourself from the room.",
    });

    await removeMember(roomId, member.id);
    const remaining = await db
      .select({ id: roomMember.id })
      .from(roomMember)
      .where(and(eq(roomMember.roomId, roomId), eq(roomMember.userId, member.id)))
      .limit(1);
    expect(remaining).toHaveLength(0);

    await db.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId,
      userId: member.id,
      role: "member",
    });
    await signInAs(member);
    await expect(removeMember(roomId, owner.id)).rejects.toThrow(
      "NEXT_REDIRECT:/rooms",
    );

    await db.delete(room).where(eq(room.id, roomId));
  });
});