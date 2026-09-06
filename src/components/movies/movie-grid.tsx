"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { Movie } from "@/lib/tmdb/types";
import { Input } from "@/components/ui/input";
import { useMovieSearch } from "./use-movie-search";
import { MovieCard } from "./movie-card";
import { MovieModal } from "./movie-modal";

interface Props {
  initialMovies: Movie[];
  title?: string;
}

export function MovieGrid({
  initialMovies,
  title = "Popular Movies",
}: Props) {
  const { query, setQuery, results, isSearching, error } =
    useMovieSearch(initialMovies);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight">
          {query ? `Results for "${query}"` : title}
        </h2>
        <div className="relative">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies..."
            className="w-56 pr-8"
            aria-label="Search movies"
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {!isSearching && results.length === 0 && (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No movies found{query ? ` for "${query}"` : ""}.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {results.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onOpen={() => setSelectedId(movie.id)}
          />
        ))}
      </div>

      {selectedId !== null && (
        <MovieModal movieId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}