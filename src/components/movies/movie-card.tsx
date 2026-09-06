"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { Movie } from "@/lib/tmdb/types";
import { tmdbImage } from "@/lib/tmdb/client";

interface Props {
  movie: Movie;
  onOpen: () => void;
}

export function MovieCard({ movie, onOpen }: Props) {
  const year = movie.release_date?.slice(0, 4) ?? "—";
  const rating = movie.vote_average?.toFixed(1) ?? "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md border bg-muted">
        <Image
          src={tmdbImage(movie.poster_path, "w342")}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25" />
        <span className="absolute left-0 top-0 flex items-center gap-1 rounded-br-md bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
          <Star className="size-3 fill-current" />
          {rating}
        </span>
      </div>

      <div className="pt-2">
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
          {movie.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{year}</p>
      </div>
    </button>
  );
}