"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import type { Genre, MovieDetail } from "@/lib/tmdb/types";
import { tmdbImage } from "@/lib/tmdb/client";

// Fields the hero content block renders. Any detail-shaped object with at
// least these fields is assignable, so the room hero can reuse it too.
export interface HeroMovie {
  title: string;
  release_date: string;
  tagline: string;
  vote_average: number;
  runtime: number | null;
  genres: Genre[];
}

export function HeroContent({ movie }: { movie: HeroMovie }) {
  const year = movie.release_date?.slice(0, 4);
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <>
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
        Featured Film
      </p>
      {year && (
        <p className="mb-1 text-sm font-semibold text-muted-foreground">
          {year}
        </p>
      )}
      <h2 className="text-4xl font-bold uppercase leading-none tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        {movie.title}
      </h2>
      {movie.tagline && (
        <p className="mt-3 hidden max-w-lg text-base leading-relaxed text-muted-foreground sm:block">
          {movie.tagline}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          <Star className="size-3 fill-current" />
          {movie.vote_average.toFixed(1)}
        </span>
        {runtime && <span>{runtime}</span>}
        {movie.genres.slice(0, 3).map((genre) => (
          <span
            key={genre.id}
            className="hidden text-xs font-semibold uppercase tracking-wider sm:inline"
          >
            {genre.name}
          </span>
        ))}
      </div>
    </>
  );
}

interface Props {
  movies: MovieDetail[];
}

export function Hero({ movies }: Props) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (movies.length > 0) setIndex(Math.floor(Math.random() * movies.length));
  }, [movies]);

  const movie = index === null ? null : movies[index] ?? null;

  if (!movie) {
    return (
      <section className="h-[50vh] min-h-[320px] w-full bg-muted sm:h-[60vh]" />
    );
  }

  return (
    <section className="relative h-[50vh] min-h-[320px] w-full overflow-hidden sm:h-[60vh]">
      {movie.backdrop_path && (
        <Image
          src={tmdbImage(movie.backdrop_path, "original")}
          alt={movie.title}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-transparent" />

      <div className="relative mx-auto flex h-full w-full max-w-6xl items-end px-4 pb-10 sm:items-center sm:pb-0">
        <div className="max-w-2xl animate-in fade-in-0 slide-in-from-bottom-4">
          <HeroContent movie={movie} />
        </div>
      </div>
    </section>
  );
}