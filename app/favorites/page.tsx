"use client";

import { useEffect, useState } from "react";
import type { Movie, MovieDetail } from "@/lib/types";
import { getFavorites } from "@/lib/favorites";
import { fetchMovieDetails } from "@/app/actions/getMovieDetails";
import Hero from "@/app/components/Hero";
import MovieGrid from "@/app/components/MovieGrid";

export default function FavoritesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [heroMovie, setHeroMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getFavorites();

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    Promise.all(ids.map((id) => fetchMovieDetails(id)))
      .then((details) => {
        const sorted = [...details].sort(
          (a, b) => b.vote_average - a.vote_average,
        );
        setHeroMovie(sorted[0]);

        const asMovies: Movie[] = details.map((d) => ({
          id: d.id,
          title: d.title,
          overview: d.overview,
          poster_path: d.poster_path,
          backdrop_path: d.backdrop_path,
          release_date: d.release_date,
          vote_average: d.vote_average,
          vote_count: d.vote_count,
          genre_ids: d.genres.map((g) => g.id),
          popularity: 0,
        }));
        setMovies(asMovies);
      })
      .finally(() => setLoading(false));
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <>
        <div
          className="w-full h-[30vh] min-h-[180px] max-h-[260px] animate-pulse"
          style={{ background: "var(--bg-secondary)" }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div
            className="h-5 w-40 animate-pulse mb-8"
            style={{ background: "var(--bg-secondary)" }}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div
                  className="aspect-[2/3]"
                  style={{ background: "var(--bg-card)" }}
                />
                <div className="pt-2 space-y-1.5">
                  <div
                    className="h-3 w-4/5"
                    style={{ background: "var(--bg-secondary)" }}
                  />
                  <div
                    className="h-2.5 w-1/3"
                    style={{ background: "var(--bg-secondary)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // Empty state
  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <span className="text-6xl">🤍</span>
        <h2 className="font-condensed text-2xl font-bold text-white uppercase">
          No favorites yet
        </h2>
        <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
          Browse movies and tap the heart icon to save your favorites here.
        </p>
      </div>
    );
  }

  return (
    <>
      {heroMovie && <Hero movie={heroMovie} compact />}
      <MovieGrid initialMovies={movies} title="Favorite Movies" />
    </>
  );
}
