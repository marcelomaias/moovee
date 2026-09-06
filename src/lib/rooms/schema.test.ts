import { describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { room } from "@/lib/rooms/schema";
import { user } from "@/lib/auth/schema";
import { eq } from "drizzle-orm";
import { createUser, makeTestUser } from "@test/helpers/seed";

describe("room schema", () => {
  it("creates and reads back a room with the owner", async () => {
    const owner = await createUser(makeTestUser("room-schema", "user"));

    const id = `room-${crypto.randomUUID()}`;
    await db.insert(room).values({
      id,
      name: "Friday Night",
      description: "Sci-fi picks",
      ownerId: owner.id,
    });

    const rows = await db
      .select()
      .from(room)
      .where(eq(room.id, id))
      .limit(1);
    expect(rows[0]).toMatchObject({
      id,
      name: "Friday Night",
      description: "Sci-fi picks",
      ownerId: owner.id,
      approvalMode: "majority",
      approvalThreshold: null,
    });

    await db.delete(room).where(eq(room.id, id));
    await db.delete(user).where(eq(user.id, owner.id));
  });
});