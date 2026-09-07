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
  isWatchedPending,
  handleRef,
  onRemove,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isOwner: boolean;
  isLocked: boolean;
  isWatchedPending: boolean;
  handleRef?: Ref<HTMLButtonElement>;
  onRemove?: (id: string) => void;
  onWatched: (id: string) => void;
}) {
  return (
    <>
      <span className="w-8 text-center text-base font-semibold text-muted-foreground">
        {index + 1}
      </span>
      {isOwner ? (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${entry.title}`}
          disabled={isLocked}
          className="cursor-grab rounded-lg border p-2 text-muted-foreground transition-colors hover:bg-muted active:cursor-grabbing disabled:cursor-default disabled:opacity-50"
        >
          <GripVertical className="size-5" />
        </button>
      ) : null}
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
          {entry.releaseYear ?? "Unknown year"}
        </p>
      </div>
      {isOwner && onRemove ? (
        <Button
          size="icon-lg"
          variant="ghost"
          disabled={isLocked}
          onClick={() => onRemove(entry.id)}
          aria-label={`Remove ${entry.title} from queue`}
        >
          <X className="size-5" />
        </Button>
      ) : null}
      <Button
        disabled={isWatchedPending}
        onClick={() => onWatched(entry.id)}
      >
        {isWatchedPending ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Marking as Watched…
          </>
        ) : (
          <>
            <Check className="size-5" />
            Mark as Watched
          </>
        )}
      </Button>
    </>
  );
}

function SortableQueueRow({
  entry,
  index,
  isLocked,
  isWatchedPending,
  onRemove,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isLocked: boolean;
  isWatchedPending: boolean;
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
      className={`flex items-center gap-4 rounded-xl border bg-card p-4 transition-opacity ${
        isDragSource ? "opacity-60" : ""
      }`}
    >
      <RowBody
        entry={entry}
        index={index}
        isOwner
        isLocked={isLocked}
        isWatchedPending={isWatchedPending}
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
  isWatchedPending,
  onWatched,
}: {
  entry: QueueEntryData;
  index: number;
  isLocked: boolean;
  isWatchedPending: boolean;
  onWatched: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-4 rounded-xl border bg-card p-4">
      <RowBody
        entry={entry}
        index={index}
        isOwner={false}
        isLocked={isLocked}
        isWatchedPending={isWatchedPending}
        onWatched={onWatched}
      />
    </li>
  );
}

export function QueueList({ roomId, entries, isOwner }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingWatchedId, setPendingWatchedId] = useState<string | null>(
    null,
  );
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

  const watch = (entryId: string) => {
    if (pendingWatchedId !== null) return;
    setPendingWatchedId(entryId);
    startTransition(async () => {
      try {
        await markWatched(roomId, entryId);
        router.refresh();
      } finally {
        setPendingWatchedId(null);
      }
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
      <p className="rounded-xl border border-dashed p-12 text-center text-base text-muted-foreground">
        Nothing in the queue yet. Approved suggestions appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {isSavingOrder ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" /> Saving order…
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-base text-destructive"
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
          <ol className="space-y-4">
            {optimisticEntries.map((entry, i) => (
              <SortableQueueRow
                key={entry.id}
                entry={entry}
                index={i}
                isLocked={isLocked}
                isWatchedPending={pendingWatchedId === entry.id}
                onRemove={(id) => run(() => removeQueueEntry(roomId, id))}
                onWatched={watch}
              />
            ))}
          </ol>
        </DragDropProvider>
      ) : (
        <ol className="space-y-4">
          {optimisticEntries.map((entry, i) => (
            <PlainQueueRow
              key={entry.id}
              entry={entry}
              index={i}
              isLocked={isLocked}
              isWatchedPending={pendingWatchedId === entry.id}
              onWatched={watch}
            />
          ))}
        </ol>
      )}
    </div>
  );
}