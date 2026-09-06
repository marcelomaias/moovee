"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, Star } from "lucide-react";
import type { MovieDetail } from "@/lib/tmdb/types";
import { tmdbImage } from "@/lib/tmdb/client";
import { fetchMovieDetails } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  movieId: number;
  onClose: () => void;
}

export function MovieModal({ movieId, onClose }: Props) {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchMovieDetails(movieId)
      .then((data) => {
        if (!cancelled) setMovie(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const director = movie?.credits.crew.find((c) => c.job === "Director");
  const topCast = movie?.credits.cast.slice(0, 6) ?? [];
  const runtime = movie?.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid grid-cols-1 overflow-x-hidden max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        {movie && movie.backdrop_path && (
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={tmdbImage(movie.backdrop_path, "w780")}
              alt={movie.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/50 to-transparent" />
          </div>
        )}

        {/* 
          3. Added 'w-full min-w-0 overflow-hidden' to the main inner layout zone to prevent content leakage.
        */}
        <div
          className={cn(
            "w-full min-w-0 overflow-hidden",
            movie?.backdrop_path ? "relative -mt-20 p-6 sm:-mt-32" : "p-6",
          )}
        >
          {loading && (
            <Loader2 className="mx-auto my-16 size-6 animate-spin text-muted-foreground" />
          )}

          {error && !loading && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Failed to load movie details.
            </p>
          )}

          {movie && !loading && (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-3xl font-bold leading-tight sm:text-4xl">
                  {movie.title}
                </DialogTitle>
                {movie.tagline && (
                  <p className="text-sm italic text-muted-foreground">
                    {movie.tagline}
                  </p>
                )}
              </DialogHeader>

              <div className="mt-5 flex flex-col gap-6 sm:flex-row w-full min-w-0">
                <div className="shrink-0 hidden md:block">
                  <div className="relative aspect-2/3 w-32 overflow-hidden rounded-md border bg-muted sm:w-40">
                    <Image
                      src={tmdbImage(movie.poster_path, "w342")}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      <Star className="size-3 fill-current" />
                      {movie.vote_average.toFixed(1)}
                    </span>
                    {movie.release_date?.slice(0, 4) && (
                      <span>{movie.release_date.slice(0, 4)}</span>
                    )}
                    {runtime && <span>{runtime}</span>}
                    {movie.status && <span>{movie.status}</span>}
                    {director && (
                      <span>
                        Dir.{" "}
                        <span className="font-medium text-foreground">
                          {director.name}
                        </span>
                      </span>
                    )}
                  </div>

                  {movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {movie.genres.map((genre) => (
                        <span
                          key={genre.id}
                          className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Overview
                    </h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {movie.overview || "No overview available."}
                    </p>
                  </div>

                  {topCast.length > 0 && (
                    /* 
                      6. Restructured the Cast layout wrapper node to use 'w-full min-w-0' layout bounds.
                    */
                    <div className="w-full min-w-0">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Cast
                      </h4>
                      {/* 
                        7. Appended 'w-full' to ensure the flex track scales to its current visible window width.
                      */}
                      <div className="flex w-full gap-4 overflow-x-auto pb-2">
                        {topCast.map((member) => (
                          <div key={member.id} className="shrink-0 text-center">
                            <div className="relative mx-auto mb-1 size-14 overflow-hidden rounded-full border bg-muted">
                              <Image
                                src={tmdbImage(member.profile_path, "w185")}
                                alt={member.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <p className="line-clamp-2 max-w-16 text-xs font-medium leading-tight text-foreground">
                              {member.name}
                            </p>
                            <p className="line-clamp-1 max-w-16 text-[11px] leading-tight text-muted-foreground">
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
      </DialogContent>
    </Dialog>
  );
}
