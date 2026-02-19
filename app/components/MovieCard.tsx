"use client";

import Image from "next/image";
import type { Movie } from "@/lib/types";
import { tmdbImage } from "@/lib/tmdb";
import FavoriteButton from "./FavoriteButton";
import { Star } from "lucide-react";

interface Props {
  movie: Movie;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}

function FilledStarIcon() {
  return <Star fill="#fff" stroke="none" size={16} className="inline" />;
}

export default function MovieCard({
  movie,
  isFavorite,
  onToggleFavorite,
  onOpen,
}: Props) {
  const year = movie.release_date?.slice(0, 4) ?? "—";
  const rating = movie.vote_average?.toFixed(1) ?? "—";

  return (
    <div className="group flex flex-col cursor-pointer">
      {/* Poster */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-md surface-card"
        onClick={onOpen}
      >
        <Image
          src={tmdbImage(movie.poster_path, "w342")}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/55" />

        {/* Rating badge */}
        <div className="badge-accent rounded-br-sm absolute top-0 left-0 flex items-center gap-1">
          <FilledStarIcon /> {rating}
        </div>

        {/* Favorite button */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="pt-2 pb-1" onClick={onOpen}>
        <h3 className="text-sm font-semibold text-white leading-tight line-clamp-1">
          {movie.title}
        </h3>
        <p className="text-xs mt-0.5 text-muted">{year}</p>
      </div>
    </div>
  );
}
