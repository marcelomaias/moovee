"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import { tmdbImage } from "@/lib/tmdb/client";
import { Button } from "@/components/ui/button";
import { MovieModal } from "@/components/movies/movie-modal";
import { cn } from "@/lib/utils";

export interface QueueMovie {
  tmdbId: number;
  title: string;
  releaseYear: string | null;
  backdropPath: string | null;
  posterPath: string | null;
}

interface Props {
  movies: QueueMovie[];
}

export function QueueHero({ movies }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(true);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel(
    { watchDrag: false },
    [Fade()],
  );
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  const hasThumbs = movies.length > 1;

  const onThumbClick = useCallback(
    (index: number) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi, emblaThumbsApi],
  );

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    onSelect();
    emblaMainApi.on("select", onSelect).on("reInit", onSelect);
  }, [emblaMainApi, onSelect]);

  useEffect(() => {
    const thumbs = emblaThumbsApi;
    if (!thumbs) return;
    const update = () => {
      setPrevDisabled(!thumbs.canScrollPrev());
      setNextDisabled(!thumbs.canScrollNext());
    };
    update();
    thumbs.on("select", update).on("reInit", update).on("scroll", update);
    return () => {
      thumbs.off("select", update).off("reInit", update).off("scroll", update);
    };
  }, [emblaThumbsApi]);

  const movie = movies[selectedIndex] ?? movies[0];

  return (
    <section>
      <div className="relative">
        <div className="relative h-[50vh] min-h-[340px] overflow-hidden rounded-2xl bg-muted sm:h-[60vh]">
          <div ref={emblaMainRef} className="h-full overflow-hidden">
            <div className="flex h-full">
              {movies.map((m, i) => (
                <div
                  key={m.tmdbId}
                  className="relative min-w-0 flex-[0_0_100%]"
                >
                  {m.backdropPath ? (
                    <Image
                      src={tmdbImage(m.backdropPath, "w1280")}
                      alt={m.title}
                      fill
                      priority={i === 0}
                      sizes="(max-width: 1024px) 100vw, 1024px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

          <div className="absolute inset-0 z-10 flex items-end gap-6 p-6 pb-28 sm:items-center sm:p-10">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold uppercase leading-tight tracking-tight text-foreground sm:text-5xl">
                {movie.title}
              </h2>
              {movie.releaseYear && (
                <p className="mt-2 text-sm font-semibold text-muted-foreground sm:text-base">
                  {movie.releaseYear}
                </p>
              )}
              <Button
                size="lg"
                className="mt-4"
                onClick={() => setDetailId(movie.tmdbId)}
              >
                <Info className="size-5" /> More Info
              </Button>
            </div>
          </div>
        </div>

        {hasThumbs ? (
          <div className="relative z-20 -mt-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                disabled={prevDisabled}
                onClick={() => emblaThumbsApi?.scrollPrev()}
                aria-label="Previous movies"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <div ref={emblaThumbsRef} className="min-w-0 overflow-hidden py-2">
                <div className="flex gap-3">
                  {movies.map((m, i) => (
                    <button
                      key={m.tmdbId}
                      type="button"
                      onClick={() => onThumbClick(i)}
                      aria-label={`Show ${m.title}`}
                      aria-current={i === selectedIndex}
                      className={cn(
                        "relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted transition-all",
                        i === selectedIndex
                          ? "scale-110 border-foreground opacity-100"
                          : "opacity-50 hover:opacity-90",
                      )}
                    >
                      <Image
                        src={tmdbImage(m.posterPath, "w185")}
                        alt={m.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={nextDisabled}
                onClick={() => emblaThumbsApi?.scrollNext()}
                aria-label="Next movies"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {detailId !== null ? (
        <MovieModal movieId={detailId} onClose={() => setDetailId(null)} />
      ) : null}
    </section>
  );
}