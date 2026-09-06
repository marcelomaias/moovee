import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/rooms/schema";
import { RoomCard } from "@/components/rooms/room-card";
import { Button } from "@/components/ui/button";

export default async function RoomsPage() {
  const session = await requireUser();

  const memberships = await db
    .select({ room })
    .from(roomMember)
    .innerJoin(room, eq(roomMember.roomId, room.id))
    .where(eq(roomMember.userId, session.user.id))
    .orderBy(desc(room.createdAt));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="mt-2 text-muted-foreground">
            Collaborative movie rooms you belong to.
          </p>
        </div>
        <Button asChild>
          <Link href="/rooms/new">Create Room</Link>
        </Button>
      </div>

      {memberships.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">
          You are not in any rooms yet. Create one to get started.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {memberships.map(({ room: r }) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      )}
    </main>
  );
}