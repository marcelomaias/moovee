import { Suspense } from "react";
import { MovieBrowser } from "@/components/movies/movie-browser";
import { MovieGridSkeleton } from "@/components/movies/movie-grid-skeleton";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<MovieGridSkeleton />}>
        <MovieBrowser />
      </Suspense>
    </div>
  );
}