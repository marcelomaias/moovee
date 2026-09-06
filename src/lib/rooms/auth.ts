import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/permissions";
import { room, roomMember } from "@/lib/rooms/schema";

export async function requireRoomMember(roomId: string) {
  const session = await requireUser();

  const rows = await db
    .select({ membership: roomMember, room })
    .from(roomMember)
    .innerJoin(room, eq(roomMember.roomId, room.id))
    .where(
      and(eq(roomMember.roomId, roomId), eq(roomMember.userId, session.user.id)),
    )
    .limit(1);

  if (rows.length === 0) redirect("/rooms");

  return { session, room: rows[0].room, membership: rows[0].membership };
}

export async function requireRoomOwner(roomId: string) {
  const result = await requireRoomMember(roomId);
  if (result.membership.role !== "owner") redirect("/rooms");
  return result;
}