"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { MovieDetail } from "@/lib/types";
import { tmdbImage } from "@/lib/tmdb";

interface Props {
  movie: MovieDetail;
  compact?: boolean;
}

export default function Hero({ movie, compact = false }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const year = movie.release_date?.slice(0, 4);
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <section
      className={`relative w-full overflow-hidden ${
        compact
          ? "h-[30vh] min-h-[180px] max-h-[260px] sm:h-[36vh] sm:min-h-[240px] sm:max-h-[320px]"
          : "h-[55vh] min-h-[320px] max-h-[500px] sm:h-[62vh] sm:min-h-[400px] lg:h-[68vh] lg:max-h-[700px]"
      } bg-[var(--bg-primary)]`}
    >
      {/* Backdrop */}
      {movie.backdrop_path && (
        <Image
          src={tmdbImage(movie.backdrop_path, "original")}
          alt={movie.title}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-[rgba(14,17,23,0.55)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[rgba(14,17,23,0.2)] to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[rgba(14,17,23,0.5)] to-transparent" />

      {/* Content */}
      <div
        className={`
          absolute inset-0 flex items-center max-w-7xl mx-auto px-4 sm:px-6
          transition-all duration-700 ease-out
          ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
        `}
      >
        <div className="max-w-xs sm:max-w-md lg:max-w-xl">
          {/* Label */}
          <p className="label mb-2 sm:mb-3">
            {compact ? "★ Top Favorite" : "★ Featured Film"}
          </p>

          {/* Year */}
          {year && (
            <p className="text-xs sm:text-base font-semibold mb-1 sm:mb-2 text-muted">
              {year}
            </p>
          )}

          {/* Title */}
          <h2
            className="font-condensed font-extrabold text-white leading-none mb-2 sm:mb-3 uppercase"
            style={{
              fontSize: compact
                ? "clamp(1.8rem, 6vw, 3rem)"
                : "clamp(2.8rem, 8vw, 7rem)",
              letterSpacing: "-0.01em",
            }}
          >
            {movie.title}
          </h2>

          {/* Tagline */}
          {movie.tagline && !compact && (
            <p className="hidden sm:block text-sm sm:text-xl leading-relaxed mb-3 sm:mb-5 max-w-lg text-muted">
              {movie.tagline}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <span className="badge-accent text-sm sm:text-base px-3 py-1">
              ★ {movie.vote_average.toFixed(1)}
            </span>
            {runtime && (
              <span className="text-[10px] sm:text-sm font-medium text-muted">
                {runtime}
              </span>
            )}
            {movie.genres.slice(0, 3).map((g) => (
              <span
                key={g.id}
                className="hidden sm:inline text-sm font-medium uppercase tracking-wide text-muted"
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
