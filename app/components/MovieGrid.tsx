"use client";

import { useState } from "react";
import type { Movie } from "@/lib/types";
import { useMovieSearch } from "@/hooks/useMovieSearch";
import { useFavorites } from "@/hooks/useFavorites";
import MovieCard from "./MovieCard";
import MovieModal from "./MovieModal";
import SearchBar from "./SearchBar";

interface Props {
  initialMovies: Movie[];
  title?: string;
}

export default function MovieGrid({
  initialMovies,
  title = "Popular Movies",
}: Props) {
  const { query, setQuery, results, isSearching, error } =
    useMovieSearch(initialMovies);
  const { toggle, isFav } = useFavorites();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 ">
        {/* Filter bar */}
        <div className="relative flex items-center justify-between pb-3 mb-6 sm:mb-8">
          <div className="absolute bottom-0 left-0 right-0 h-[2px] surface" />
          <div className="absolute bottom-0 left-0 h-[2px] w-16 bg-[var(--accent)]" />

          <span className="label text-sm sm:text-xl text-white pb-1">
            {query ? `Results for "${query}"` : title}
          </span>

          <SearchBar
            value={query}
            onChange={setQuery}
            isSearching={isSearching}
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm mb-4 text-accent">{error}</p>}

        {/* Empty state */}
        {!isSearching && results.length === 0 && (
          <p className="text-center py-20 text-sm text-muted">
            No movies found for &quot;{query}&quot;.
          </p>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
          {results.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              isFavorite={isFav(movie.id)}
              onToggleFavorite={() => toggle(movie.id)}
              onOpen={() => setSelectedId(movie.id)}
            />
          ))}
        </div>
      </div>

      {selectedId !== null && (
        <MovieModal
          movieId={selectedId}
          isFavorite={isFav(selectedId)}
          onToggleFavorite={() => toggle(selectedId)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
