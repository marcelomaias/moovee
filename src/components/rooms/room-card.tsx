import Link from "next/link";
import { DoorOpen } from "lucide-react";
import type { InferSelectModel } from "drizzle-orm";
import { room } from "@/lib/rooms/schema";

type Room = InferSelectModel<typeof room>;

export function RoomCard({ room }: { room: Room }) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      className="group flex flex-col gap-1 rounded-xl border bg-card p-5 transition-all hover:shadow-sm"
    >
      <div className="flex items-center gap-2">
        <DoorOpen className="size-4 text-muted-foreground" />
        <h2 className="font-semibold">{room.name}</h2>
      </div>
      {room.description ? (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {room.description}
        </p>
      ) : null}
    </Link>
  );
}