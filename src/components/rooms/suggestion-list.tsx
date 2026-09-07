"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb/client";
import { Button } from "@/components/ui/button";
import { approveSuggestion } from "@/app/rooms/actions";

export interface SuggestionData {
  id: string;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  suggestedAt: Date;
  approvals: number;
}

interface Props {
  roomId: string;
  suggestions: SuggestionData[];
  memberCount: number;
  myVotes: string[];
}

export function SuggestionList({
  roomId,
  suggestions,
  memberCount,
  myVotes,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const voted = new Set(myVotes);
  const sorted = [...suggestions].sort(
    (a, b) => Number(voted.has(a.id)) - Number(voted.has(b.id)),
  );

  const approve = (suggestionId: string) => {
    setActingId(suggestionId);
    startTransition(async () => {
      await approveSuggestion(roomId, suggestionId);
      router.refresh();
      setActingId(null);
    });
  };

  if (suggestions.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-12 text-center text-base text-muted-foreground">
        No pending suggestions. Suggest a movie to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {sorted.map((s) => {
        const alreadyVoted = voted.has(s.id);
        const isActing = actingId === s.id;
        return (
          <li
            key={s.id}
            className="flex items-center gap-4 rounded-xl border bg-card p-4"
          >
            <div className="relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
              <Image
                src={tmdbImage(s.posterPath, "w185")}
                alt={s.title}
                width={64}
                height={96}
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">
                {s.releaseYear ?? "Unknown year"} · suggested{" "}
                {s.suggestedAt.toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-sm font-medium text-muted-foreground">
              {s.approvals}/{memberCount} approvals
            </span>
            <Button
              disabled={alreadyVoted || isActing}
              onClick={() => approve(s.id)}
            >
              {alreadyVoted ? (
                <>
                  <Check className="size-5" /> Approved
                </>
              ) : isActing ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Approve"
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}