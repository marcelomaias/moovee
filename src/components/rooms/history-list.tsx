"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
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
  const [pending, startTransition] = useTransition();

  const remove = (tmdbId: number) => {
    startTransition(async () => {
      await removeHistoryEntry(roomId, tmdbId);
      router.refresh();
    });
  };

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nothing watched yet. Mark movies in the queue as watched.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-4 rounded-lg border bg-card p-3"
        >
          <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
            <Image
              src={tmdbImage(entry.posterPath, "w185")}
              alt={entry.title}
              width={48}
              height={72}
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{entry.title}</p>
            <p className="text-xs text-muted-foreground">
              {entry.releaseYear ?? "Unknown year"} · watched{" "}
              {entry.watchedAt.toLocaleDateString()}
            </p>
          </div>
          {isOwner ? (
            <Button
              size="icon"
              variant="ghost"
              disabled={pending}
              onClick={() => remove(entry.tmdbId)}
              aria-label={`Remove ${entry.title} from history`}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}