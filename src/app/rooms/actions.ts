"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/permissions";
import { room, roomMember } from "@/lib/rooms/schema";
import { requireRoomMember, requireRoomOwner } from "@/lib/rooms/auth";

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