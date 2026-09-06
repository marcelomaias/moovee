"use client";

import { useOptimistic, useState, useTransition, type Ref } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, GripVertical, Loader2, X } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
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

function RowBody({
  entry,
  index,
  isOwner,
  isLocked,
  handleRef,
  onRemove,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isOwner: boolean;
  isLocked: boolean;
  handleRef?: Ref<HTMLButtonElement>;
  onRemove?: (id: string) => void;
  onWatched: (id: string) => void;
}) {
  return (
    <>
      <span className="w-6 text-center text-sm font-semibold text-muted-foreground">
        {index + 1}
      </span>
      {isOwner ? (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${entry.title}`}
          disabled={isLocked}
          className="cursor-grab rounded-md border p-1.5 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
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
      {isOwner && onRemove ? (
        <Button
          size="icon"
          variant="ghost"
          disabled={isLocked}
          onClick={() => onRemove(entry.id)}
          aria-label={`Remove ${entry.title} from queue`}
        >
          <X className="size-4" />
        </Button>
      ) : null}
      <Button
        size="sm"
        disabled={isLocked}
        onClick={() => onWatched(entry.id)}
      >
        {isLocked ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Check className="size-4" />
        )}
        Watched
      </Button>
    </>
  );
}

function SortableQueueRow({
  entry,
  index,
  isLocked,
  onRemove,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isLocked: boolean;
  onRemove: (id: string) => void;
  onWatched: (id: string) => void;
}) {
  const { ref, handleRef, isDragSource } = useSortable({
    id: entry.id,
    index,
    disabled: isLocked,
  });

  return (
    <li
      ref={ref}
      className={`flex items-center gap-4 rounded-lg border bg-card p-3 transition-opacity ${
        isDragSource ? "opacity-60" : ""
      }`}
    >
      <RowBody
        entry={entry}
        index={index}
        isOwner
        isLocked={isLocked}
        handleRef={handleRef}
        onRemove={onRemove}
        onWatched={onWatched}
      />
    </li>
  );
}

function PlainQueueRow({
  entry,
  index,
  isLocked,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isLocked: boolean;
  onWatched: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-lg border bg-card p-3">
      <RowBody
        entry={entry}
        index={index}
        isOwner={false}
        isLocked={isLocked}
        onWatched={onWatched}
      />
    </li>
  );
}

export function QueueList({ roomId, entries, isOwner }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSavingOrder, startReorderTransition] = useTransition();
  const [optimisticEntries, setOptimisticEntries] = useOptimistic(entries);

  const isLocked = isPending || isSavingOrder;

  const run = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  };

  const persistOrder = (next: QueueEntryData[]) => {
    setError(null);
    startReorderTransition(async () => {
      setOptimisticEntries(next);
      try {
        await reorderQueue(roomId, next.map((e) => e.id));
        router.refresh();
      } catch {
        setError("Couldn't save the new queue order.");
      }
    });
  };

  if (optimisticEntries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Nothing in the queue yet. Approved suggestions appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {isSavingOrder ? (
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Loader2 className="size-3 animate-spin" /> Saving order…
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {isOwner ? (
        <DragDropProvider
          onDragEnd={(event) => {
            if (event.canceled || isLocked) return;
            const next = move(optimisticEntries, event);
            const key = (arr: QueueEntryData[]) =>
              arr.map((e) => e.id).join("\u0000");
            if (key(next) === key(optimisticEntries)) return;
            persistOrder(next);
          }}
        >
          <ol className="space-y-3">
            {optimisticEntries.map((entry, i) => (
              <SortableQueueRow
                key={entry.id}
                entry={entry}
                index={i}
                isLocked={isLocked}
                onRemove={(id) => run(() => removeQueueEntry(roomId, id))}
                onWatched={(id) => run(() => markWatched(roomId, id))}
              />
            ))}
          </ol>
        </DragDropProvider>
      ) : (
        <ol className="space-y-3">
          {optimisticEntries.map((entry, i) => (
            <PlainQueueRow
              key={entry.id}
              entry={entry}
              index={i}
              isLocked={isLocked}
              onWatched={(id) => run(() => markWatched(roomId, id))}
            />
          ))}
        </ol>
      )}
    </div>
  );
}