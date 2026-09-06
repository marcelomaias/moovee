import { Suspense } from "react";
import type { Movie } from "@/lib/tmdb/types";
import { getPopularMovies } from "@/lib/tmdb/client";
import { FeaturedHero } from "./featured-hero";
import { MovieGrid } from "./movie-grid";
import { HeroSkeleton } from "./hero-skeleton";

export async function MovieBrowser() {
  let movies: Movie[] = [];
  let error: string | null = null;

  try {
    const { results } = await getPopularMovies();
    movies = results;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load movies.";
  }

  if (error) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">{error}</p>
    );
  }

  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <FeaturedHero movies={movies} />
      </Suspense>
      <MovieGrid initialMovies={movies} />
    </>
  );
}