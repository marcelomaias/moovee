"use client";

import { useTransition } from "react";
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
  const [pending, startTransition] = useTransition();
  const voted = new Set(myVotes);

  const approve = (suggestionId: string) => {
    startTransition(async () => {
      await approveSuggestion(roomId, suggestionId);
      router.refresh();
    });
  };

  if (suggestions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No pending suggestions. Suggest a movie to get started.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {suggestions.map((s) => {
        const alreadyVoted = voted.has(s.id);
        return (
          <li
            key={s.id}
            className="flex items-center gap-4 rounded-lg border bg-card p-3"
          >
            <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
              <Image
                src={tmdbImage(s.posterPath, "w185")}
                alt={s.title}
                width={48}
                height={72}
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.releaseYear ?? "Unknown year"} · suggested{" "}
                {s.suggestedAt.toLocaleDateString()}
              </p>
            </div>
            <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {s.approvals}/{memberCount} approvals
            </span>
            <Button
              size="sm"
              disabled={alreadyVoted || pending}
              onClick={() => approve(s.id)}
            >
              {alreadyVoted ? (
                <>
                  <Check className="size-4" /> Approved
                </>
              ) : pending ? (
                <Loader2 className="size-4 animate-spin" />
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