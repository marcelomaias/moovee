"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeMember } from "@/app/rooms/actions";

export interface MemberData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Props {
  roomId: string;
  members: MemberData[];
  currentUserId: string;
}

export function MemberList({ roomId, members, currentUserId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const remove = (userId: string) => {
    setPending(userId);
    void removeMember(roomId, userId).then(() => {
      setPending(null);
      router.refresh();
    });
  };

  return (
    <ul className="divide-y rounded-lg border bg-card">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {m.name}
              {m.role === "owner" && (
                <span className="ml-2 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  Owner
                </span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">{m.email}</p>
          </div>
          {m.id !== currentUserId ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending === m.id}
              onClick={() => remove(m.id)}
            >
              {pending === m.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserX className="size-4" />
              )}
              Remove
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">You</span>
          )}
        </li>
      ))}
    </ul>
  );
}