"use client";

import { useState, useEffect, useRef } from "react";
import type { Movie } from "@/lib/types";

export function useMovieSearch(initialMovies: Movie[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movie[]>(initialMovies);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults(initialMovies);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setError("Something went wrong. Please try again.");
        setResults(initialMovies);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, initialMovies]);

  return { query, setQuery, results, isSearching, error };
}
