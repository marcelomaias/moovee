'use server'

import { getMovieDetails } from '@/lib/tmdb'
import type { MovieDetail } from '@/lib/types'

export async function fetchMovieDetails(id: number): Promise<MovieDetail> {
  // Runs on the server — TMDB_API_KEY never reaches the client
  return getMovieDetails(id)
}
