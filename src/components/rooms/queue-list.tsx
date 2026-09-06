"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ChevronDown, ChevronUp, Loader2, Trash2, X } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb/client";
import { Button } from "@/components/ui/button";
import {
  markWatched,
  removeQueueEntry,
  reorderQueue,
} from "@/app/rooms/actions";

export interface QueueEntryData {
  id: string;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
  position: number;
}

interface Props {
  roomId: string;
  entries: QueueEntryData[];
  isOwner: boolean;
}

export function QueueList({ roomId, entries, isOwner }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = entries.findIndex((e) => e.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= entries.length) return;
    const next = [...entries];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    run(() => reorderQueue(roomId, next.map((e) => e.id)));
  };

  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nothing in the queue yet. Approved suggestions appear here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          className="flex items-center gap-4 rounded-lg border bg-card p-3"
        >
          <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
            {i + 1}
          </span>
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
              {entry.releaseYear ?? "Unknown year"}
            </p>
          </div>
          {isOwner ? (
            <>
              <div className="flex flex-col">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending || i === 0}
                  onClick={() => move(entry.id, -1)}
                  aria-label={`Move ${entry.title} up`}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending || i === entries.length - 1}
                  onClick={() => move(entry.id, 1)}
                  aria-label={`Move ${entry.title} down`}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <Button
                size="icon"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => removeQueueEntry(roomId, entry.id))}
                aria-label={`Remove ${entry.title} from queue`}
              >
                <X className="size-4" />
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => markWatched(roomId, entry.id))}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            Watched
          </Button>
        </li>
      ))}
    </ol>
  );
}