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

export function SuggestMovieDialog({
  roomId,
  alreadySuggested,
}: {
  roomId: string;
  alreadySuggested: number[];
}) {
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
        <Button size="lg">
          <Plus className="size-5" /> Suggest a Movie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a Movie</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 size-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies…"
            className="h-11 pl-11 text-base"
          />
        </div>

        <div className="max-h-96 space-y-3 overflow-y-auto">
          {isSearching && (
            <Loader2 className="mx-auto my-10 size-6 animate-spin text-muted-foreground" />
          )}
          {!isSearching && query.trim() !== "" && results.length === 0 && (
            <p className="py-10 text-center text-base text-muted-foreground">
              No movies found.
            </p>
          )}
          {results.map((movie) => {
            const isSuggested = alreadySuggested.includes(movie.id);
            return (
              <div
                key={movie.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-3"
              >
                <div className="relative aspect-2/3 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={tmdbImage(movie.poster_path, "w185")}
                    alt={movie.title}
                    width={56}
                    height={84}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{movie.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {movie.release_date?.slice(0, 4) ?? "Unknown year"}
                  </p>
                </div>
                <Button
                  disabled={isSuggested || pending}
                  onClick={() => submit(movie.id)}
                >
                  {suggestingId === movie.id ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isSuggested ? (
                    "Suggested"
                  ) : (
                    "Suggest"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        {error ? (
          <p className="text-base text-destructive">{error}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}