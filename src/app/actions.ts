"use server";

import { getMovieDetails } from "@/lib/tmdb/client";
import type { MovieDetail } from "@/lib/tmdb/types";

export async function fetchMovieDetails(id: number): Promise<MovieDetail> {
  return getMovieDetails(id);
}