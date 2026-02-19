import type { Movie, MovieDetail, TMDBResponse } from "./types";

const BASE_URL = "https://api.themoviedb.org/3";

// This runs server-side only — API key is never sent to the browser
async function tmdbFetch<T>(endpoint: string, revalidate = 3600): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN;

  if (!token) {
    throw new Error("TMDB_ACCESS_TOKEN environment variable is not set.");
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: { revalidate }, // ISR cache
  });

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getPopularMovies(page = 1): Promise<TMDBResponse<Movie>> {
  return tmdbFetch(`/movie/popular?page=${page}`);
}

export async function getNowPlayingMovies(
  page = 1,
): Promise<TMDBResponse<Movie>> {
  return tmdbFetch(`/movie/now_playing?page=${page}`);
}

export async function getMovieDetails(id: number): Promise<MovieDetail> {
  return tmdbFetch(`/movie/${id}?append_to_response=credits`, 21600);
}

export async function searchMovies(
  query: string,
  page = 1,
): Promise<TMDBResponse<Movie>> {
  return tmdbFetch(
    `/search/movie?query=${encodeURIComponent(query)}&page=${page}&include_adult=false`,
    0,
  );
}

// Utility: build a full TMDB image URL.
// Falls back to an inline SVG data URI so no /placeholder.png file is needed.
export function tmdbImage(
  path: string | null,
  size: "w185" | "w342" | "w500" | "w780" | "original" = "w500",
): string {
  if (!path)
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2352525b'%3ENo Image%3C/text%3E%3C/svg%3E";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
