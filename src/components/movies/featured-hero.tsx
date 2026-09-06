import type { Movie, MovieDetail } from "@/lib/tmdb/types";
import { getMovieDetails } from "@/lib/tmdb/client";
import { Hero } from "./hero";

export async function FeaturedHero({ movies }: { movies: Movie[] }) {
  const results = await Promise.allSettled(
    movies.slice(0, 5).map((movie) => getMovieDetails(movie.id)),
  );

  const candidates: MovieDetail[] = results
    .filter(
      (r): r is PromiseFulfilledResult<MovieDetail> => r.status === "fulfilled",
    )
    .map((r) => r.value);

  if (candidates.length === 0) return null;

  return <Hero movies={candidates} />;
}