import Link from "next/link";
import { requireUser } from "@/lib/auth/permissions";
import { CreateRoomForm } from "@/components/rooms/create-room-form";

export default async function NewRoomPage() {
  await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/rooms"
        className="text-base text-muted-foreground hover:text-foreground"
      >
        ← Back to rooms
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Create Room</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        Name your room and optionally describe it.
      </p>

      <div className="mt-10 rounded-xl border p-8">
        <CreateRoomForm />
      </div>
    </main>
  );
}