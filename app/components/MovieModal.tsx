"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import type { MovieDetail } from "@/lib/types";
import { tmdbImage } from "@/lib/tmdb";
import { fetchMovieDetails } from "@/app/actions/getMovieDetails";
import FavoriteButton from "./FavoriteButton";

interface Props {
  movieId: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

export default function MovieModal({
  movieId,
  isFavorite,
  onToggleFavorite,
  onClose,
}: Props) {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetchMovieDetails(movieId)
      .then(setMovie)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [movieId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const director = movie?.credits.crew.find((c) => c.job === "Director");
  const topCast = movie?.credits.cast.slice(0, 6) ?? [];
  const runtime = movie?.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,12,18,0.92)] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto modal-scroll rounded-lg surface"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-sm font-bold text-white bg-[var(--accent)] transition-opacity hover:opacity-80"
        >
          ✕
        </button>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-2 rounded-full animate-spin border-[var(--accent)] border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center justify-center h-64 text-base text-muted">
            Failed to load movie details.
          </div>
        )}

        {/* Content */}
        {movie && !loading && (
          <>
            {/* Backdrop */}
            {movie.backdrop_path && (
              <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                <Image
                  src={tmdbImage(movie.backdrop_path, "w780")}
                  alt={movie.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-[rgba(14,17,23,0.55)]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-secondary)] via-transparent to-transparent" />
              </div>
            )}

            {/* Body */}
            <div className="p-6 flex flex-col lg:flex-row gap-6 -mt-32 lg:-mt-64 relative z-10">
              {/* Poster */}
              <div className="shrink-0 lg:w-44">
                <div className="relative w-32 lg:w-full aspect-[2/3] overflow-hidden rounded-md surface-card shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                  <Image
                    src={tmdbImage(movie.poster_path, "w342")}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                {/* Title + favorite */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-condensed text-3xl font-extrabold text-white uppercase leading-tight tracking-wide">
                      {movie.title}
                    </h2>
                    {movie.tagline && (
                      <p className="text-sm mt-1 italic text-muted">
                        {movie.tagline}
                      </p>
                    )}
                  </div>
                  <FavoriteButton
                    isFavorite={isFavorite}
                    onToggle={(e) => {
                      e.stopPropagation();
                      onToggleFavorite();
                    }}
                    size="md"
                  />
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span className="badge-accent">
                    ★ {movie.vote_average.toFixed(1)}
                  </span>
                  {movie.release_date?.slice(0, 4) && (
                    <span>{movie.release_date.slice(0, 4)}</span>
                  )}
                  {runtime && <span>{runtime}</span>}
                  {movie.status && <span>{movie.status}</span>}
                  {director && (
                    <span>
                      Dir.{" "}
                      <span className="text-white font-medium">
                        {director.name}
                      </span>
                    </span>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1.5">
                  {movie.genres.map((g) => (
                    <span key={g.id} className="genre-tag">
                      {g.name}
                    </span>
                  ))}
                </div>

                {/* Overview */}
                <div>
                  <p className="label mb-2">Overview</p>
                  <p className="text-sm sm:text-base leading-relaxed text-[#b0b8cc]">
                    {movie.overview || "No overview available."}
                  </p>
                </div>

                {/* Cast — hidden on mobile */}
                {topCast.length > 0 && (
                  <div className="hidden sm:block">
                    <p className="label mb-3">Cast</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {topCast.map((member) => (
                        <div
                          key={member.id}
                          className="shrink-0 text-center w-16"
                        >
                          <div className="relative w-14 h-14 mx-auto overflow-hidden mb-1 rounded-full surface-card">
                            <Image
                              src={tmdbImage(member.profile_path, "w185")}
                              alt={member.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <p className="text-white text-xs font-medium leading-tight line-clamp-2">
                            {member.name}
                          </p>
                          <p className="text-[11px] line-clamp-1 text-muted">
                            {member.character}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
