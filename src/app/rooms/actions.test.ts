import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, deleteRoom, updateRoom } from "@/app/rooms/actions";
import { requireRoomOwner } from "@/lib/rooms/auth";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/rooms/schema";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

const { redirects, sessionHeadersMock, revalidated } = vi.hoisted(() => ({
  redirects: [] as string[],
  sessionHeadersMock: { value: new Headers() },
  revalidated: [] as string[],
}));

vi.mock("next/headers", () => ({
  headers: async () => sessionHeadersMock.value,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirects.push(path);
    const err = new Error(`NEXT_REDIRECT:${path}`) as Error & {
      digest?: string;
    };
    err.digest = `NEXT_REDIRECT:${path}`;
    throw err;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidated.push(path);
  },
}));

type Room = InferSelectModel<typeof room>;

async function signedInUser(prefix: string) {
  const u = await createUser(makeTestUser(`rooms-${prefix}`, "user"));
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
  return u;
}

async function createRoomFor(owner: { id: string }): Promise<Room> {
  const fd = new FormData();
  fd.set("name", "Test Room");
  fd.set("description", "A room for tests");
  await expect(createRoom(null, fd)).rejects.toThrow("NEXT_REDIRECT:/rooms/");
  const id = redirects[redirects.length - 1].split("/").pop()!;
  const [row] = await db.select().from(room).where(eq(room.id, id)).limit(1);
  if (!row) throw new Error("room not created");
  return row;
}

async function addMember(roomId: string, user: { id: string }) {
  await db.insert(roomMember).values({
    id: crypto.randomUUID(),
    roomId,
    userId: user.id,
    role: "member",
  });
}

describe("rooms server actions", () => {
  beforeEach(() => {
    redirects.length = 0;
    revalidated.length = 0;
  });

  describe("createRoom", () => {
    it("rejects unauthenticated requests", async () => {
      sessionHeadersMock.value = new Headers();
      await expect(createRoom(null, new FormData())).rejects.toThrow(
        "NEXT_REDIRECT:/sign-in",
      );
    });

    it("rejects a missing name", async () => {
      await signedInUser("name");
      const fd = new FormData();
      const result = await createRoom(null, fd);
      expect(result).toEqual({ error: "Room name is required." });
      expect(redirects).toHaveLength(0);
    });

    it("creates a room with the owner as an owner member", async () => {
      const owner = await signedInUser("create");
      const fd = new FormData();
      fd.set("name", "Friday Night");
      fd.set("description", "Sci-fi picks");
      await expect(createRoom(null, fd)).rejects.toThrow(
        "NEXT_REDIRECT:/rooms/",
      );

      const id = redirects[redirects.length - 1].split("/").pop()!;
      expect(id).toBeTruthy();

      const [row] = await db
        .select()
        .from(room)
        .where(eq(room.id, id!))
        .limit(1);
      expect(row?.name).toBe("Friday Night");
      expect(row?.description).toBe("Sci-fi picks");
      expect(row?.ownerId).toBe(owner.id);

      const [membership] = await db
        .select()
        .from(roomMember)
        .where(and(eq(roomMember.roomId, id!), eq(roomMember.userId, owner.id)))
        .limit(1);
      expect(membership?.role).toBe("owner");

      await db.delete(room).where(eq(room.id, id!));
      await db.delete(roomMember).where(eq(roomMember.userId, owner.id));
    });
  });

  describe("requireRoomOwner", () => {
    it("rejects a member with role=member", async () => {
      const owner = await signedInUser("own");
      const member = await createUser(makeTestUser("rooms-member", "user"));
      const r = await createRoomFor(owner);
      await addMember(r.id, member);
      sessionHeadersMock.value = await getSessionHeaders(
        member.email,
        member.password,
      );

      await expect(requireRoomOwner(r.id)).rejects.toThrow(
        "NEXT_REDIRECT:/rooms",
      );
      sessionHeadersMock.value = await getSessionHeaders(
        owner.email,
        owner.password,
      );
      await db.delete(room).where(eq(room.id, r.id));
      await db.delete(roomMember).where(eq(roomMember.userId, member.id));
    });

    it("allows the owner", async () => {
      const owner = await signedInUser("deep");
      const r = await createRoomFor(owner);
      const result = await requireRoomOwner(r.id);
      expect(result.room.name).toBe("Test Room");
      expect(result.membership.role).toBe("owner");
      await db.delete(room).where(eq(room.id, r.id));
    });
  });

  describe("updateRoom", () => {
    it("rejects a non-owner member", async () => {
      const owner = await signedInUser("upd");
      const member = await createUser(makeTestUser("rooms-upd", "user"));
      const r = await createRoomFor(owner);
      await addMember(r.id, member);
      sessionHeadersMock.value = await getSessionHeaders(
        member.email,
        member.password,
      );

      const fd = new FormData();
      fd.set("name", "Hijacked");
      await expect(updateRoom(r.id, fd)).rejects.toThrow(
        "NEXT_REDIRECT:/rooms",
      );

      sessionHeadersMock.value = await getSessionHeaders(
        owner.email,
        owner.password,
      );
      await db.delete(room).where(eq(room.id, r.id));
      await db.delete(roomMember).where(eq(roomMember.userId, member.id));
    });

    it("updates name and description as the owner", async () => {
      const owner = await signedInUser("patch");
      const r = await createRoomFor(owner);
      const fd = new FormData();
      fd.set("name", "Renamed");
      fd.set("description", "New description");

      await updateRoom(r.id, fd);
      const [row] = await db.select().from(room).where(eq(room.id, r.id)).limit(1);
      expect(row?.name).toBe("Renamed");
      expect(row?.description).toBe("New description");
      expect(revalidated).toContain(`/rooms/${r.id}`);

      await db.delete(room).where(eq(room.id, r.id));
    });
  });

  describe("deleteRoom", () => {
    it("deletes the room as the owner", async () => {
      const owner = await signedInUser("del");
      const r = await createRoomFor(owner);
      await expect(deleteRoom(r.id)).rejects.toThrow("NEXT_REDIRECT:/rooms");

      const [row] = await db.select().from(room).where(eq(room.id, r.id)).limit(1);
      expect(row).toBeUndefined();
      expect(revalidated).toContain("/rooms");
      expect(redirects).toContain("/rooms");
    });
  });
});