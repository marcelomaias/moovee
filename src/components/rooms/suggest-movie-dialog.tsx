"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Plus, Search } from "lucide-react";
import { tmdbImage } from "@/lib/tmdb/client";
import { useMovieSearch } from "@/components/movies/use-movie-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { suggestMovie } from "@/app/rooms/actions";

export function SuggestMovieDialog({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestingId, setSuggestingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const { query, setQuery, results, isSearching } = useMovieSearch([]);

  const submit = (tmdbId: number) => {
    setError(null);
    setSuggestingId(tmdbId);
    startTransition(async () => {
      const result = await suggestMovie(roomId, tmdbId);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
        setQuery("");
        router.refresh();
      }
      setSuggestingId(null);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> Suggest a Movie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a Movie</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies…"
            className="pl-9"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isSearching && (
            <Loader2 className="mx-auto my-8 size-5 animate-spin text-muted-foreground" />
          )}
          {!isSearching && query.trim() !== "" && results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No movies found.
            </p>
          )}
          {results.map((movie) => (
            <div
              key={movie.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-2"
            >
              <div className="relative aspect-2/3 w-10 shrink-0 overflow-hidden rounded border bg-muted">
                <Image
                  src={tmdbImage(movie.poster_path, "w185")}
                  alt={movie.title}
                  width={40}
                  height={60}
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{movie.title}</p>
                <p className="text-xs text-muted-foreground">
                  {movie.release_date?.slice(0, 4) ?? "Unknown year"}
                </p>
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => submit(movie.id)}
              >
                {suggestingId === movie.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Suggest"
                )}
              </Button>
            </div>
          ))}
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}