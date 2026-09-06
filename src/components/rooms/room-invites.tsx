"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvite, declineInvite } from "@/app/rooms/actions";

export interface InviteData {
  roomId: string;
  roomName: string;
}

export function RoomInvites({ invites }: { invites: InviteData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (fn: (roomId: string) => Promise<unknown>, roomId: string) => {
    startTransition(async () => {
      await fn(roomId);
      router.refresh();
    });
  };

  if (invites.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No pending room invitations.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {invites.map((invite) => (
        <li
          key={invite.roomId}
          className="flex items-center gap-3 rounded-lg border bg-card p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{invite.roomName}</p>
            <p className="text-xs text-muted-foreground">
              You've been invited to this room.
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() => act(acceptInvite, invite.roomId)}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => act(declineInvite, invite.roomId)}
          >
            <X className="size-4" />
            Decline
          </Button>
        </li>
      ))}
    </ul>
  );
}