import Link from "next/link";
import { requireRoomMember } from "@/lib/rooms/auth";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const { session, room } = await requireRoomMember(roomId);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link
        href="/rooms"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to rooms
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">{room.name}</h1>
      {room.description ? (
        <p className="mt-2 text-muted-foreground">{room.description}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Member: {session.user.name}
      </p>

      <div className="mt-8 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        Queue, suggestions, and members are coming in later phases.
      </div>
    </main>
  );
}