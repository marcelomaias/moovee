import { Suspense } from "react";
import { getPopularMovies, getMovieDetails } from "@/lib/tmdb";
import MovieGrid from "./components/MovieGrid";
import MovieGridSkeleton from "./components/MovieGridSkeleton";
import Hero from "./components/Hero";

export default async function HomePage() {
  // Fetch popular movies for the grid
  const { results: movies } = await getPopularMovies();

  // Pick a random movie from the first page for the hero
  // Use a deterministic-ish pick (changes every build/revalidation)
  const heroIndex =
    Math.floor(Date.now() / 3_600_000) % Math.min(movies.length, 10);
  const heroMovie = await getMovieDetails(movies[heroIndex].id);

  return (
    <main>
      {/* Hero — full-width cinematic banner */}
      <Hero movie={heroMovie} />

      {/* Grid with sticky navbar */}
      <Suspense fallback={<MovieGridSkeleton />}>
        <MovieGrid initialMovies={movies} />
      </Suspense>
    </main>
  );
}
