import { describe, expect, it, vi } from "vitest";
import { updateApprovalSettings } from "@/app/rooms/actions";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/rooms/schema";
import { eq } from "drizzle-orm";
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

async function signedInOwner(prefix: string) {
  const u = await createUser(makeTestUser(prefix, "user"));
  sessionHeadersMock.value = await getSessionHeaders(u.email, u.password);
  const id = `room-${crypto.randomUUID()}`;
  await db.insert(room).values({ id, name: "Settings Room", ownerId: u.id });
  await db.insert(roomMember).values({
    id: crypto.randomUUID(),
    roomId: id,
    userId: u.id,
    role: "owner",
  });
  return id;
}

function settingsForm(mode: string, threshold?: string) {
  const form = new FormData();
  form.set("mode", mode);
  if (threshold !== undefined) form.set("threshold", threshold);
  return form;
}

describe("approval settings", () => {
  it("stores the mode and clears the threshold for non-percentage modes", async () => {
    const roomId = await signedInOwner("settings-a");

    await updateApprovalSettings(roomId, settingsForm("unanimous"));

    const [r] = await db.select().from(room).where(eq(room.id, roomId));
    expect(r?.approvalMode).toBe("unanimous");
    expect(r?.approvalThreshold).toBeNull();

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("stores an integer threshold for percentage mode", async () => {
    const roomId = await signedInOwner("settings-b");

    await updateApprovalSettings(roomId, settingsForm("percentage", "66"));

    const [r] = await db.select().from(room).where(eq(room.id, roomId));
    expect(r?.approvalMode).toBe("percentage");
    expect(r?.approvalThreshold).toBe(66);

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("rejects percentage thresholds outside 1..100", async () => {
    const roomId = await signedInOwner("settings-c");

    expect(
      await updateApprovalSettings(roomId, settingsForm("percentage", "0")),
    ).toEqual({ error: expect.stringContaining("between 1 and 100") });
    expect(
      await updateApprovalSettings(roomId, settingsForm("percentage", "101")),
    ).toEqual({ error: expect.stringContaining("between 1 and 100") });

    const [r] = await db.select().from(room).where(eq(room.id, roomId));
    expect(r?.approvalMode).toBe("majority");

    await db.delete(room).where(eq(room.id, roomId));
  });

  it("is owner-only", async () => {
    const owner = await createUser(makeTestUser("settings-owner", "user"));
    const interloper = await createUser(makeTestUser("settings-member", "user"));
    const roomId = await signedInOwner("settings-d");
    await db.insert(roomMember).values({
      id: crypto.randomUUID(),
      roomId,
      userId: interloper.id,
      role: "member",
    });

    sessionHeadersMock.value = await getSessionHeaders(
      interloper.email,
      interloper.password,
    );
    await expect(
      updateApprovalSettings(roomId, settingsForm("unanimous")),
    ).rejects.toThrow("NEXT_REDIRECT:/rooms");

    void owner;
    await db.delete(room).where(eq(room.id, roomId));
  });
});