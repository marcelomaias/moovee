"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb/client";
import { Button } from "@/components/ui/button";
import { removeHistoryEntry } from "@/app/rooms/actions";

export interface HistoryEntryData {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  watchedAt: Date;
}

interface Props {
  roomId: string;
  entries: HistoryEntryData[];
  isOwner: boolean;
}

export function HistoryList({ roomId, entries, isOwner }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingTmdbId, setPendingTmdbId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const remove = (tmdbId: number) => {
    if (pendingTmdbId !== null) return;
    setError(null);
    setPendingTmdbId(tmdbId);
    startTransition(async () => {
      try {
        await removeHistoryEntry(roomId, tmdbId);
        router.refresh();
      } catch {
        setError("Couldn't remove the entry from history.");
      } finally {
        setPendingTmdbId(null);
      }
    });
  };

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-12 text-center text-base text-muted-foreground">
        Nothing watched yet. Mark movies in the queue as watched.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-base text-destructive"
        >
          {error}
        </p>
      ) : null}
      <ul className="space-y-4">
        {entries.map((entry) => {
          const isRemoving = pendingTmdbId === entry.tmdbId;
          return (
            <li
              key={entry.id}
              className="flex items-center gap-4 rounded-xl border bg-card p-4"
            >
              <div className="relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={tmdbImage(entry.posterPath, "w185")}
                  alt={entry.title}
                  width={64}
                  height={96}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium">{entry.title}</p>
                <p className="text-sm text-muted-foreground">
                  {entry.releaseYear ?? "Unknown year"} · watched{" "}
                  {entry.watchedAt.toLocaleDateString()}
                </p>
              </div>
              {isOwner ? (
                <Button
                  size="icon-lg"
                  variant="ghost"
                  disabled={isRemoving}
                  onClick={() => remove(entry.tmdbId)}
                  aria-label={`Remove ${entry.title} from history`}
                >
                  {isRemoving ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <X className="size-5" />
                  )}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}