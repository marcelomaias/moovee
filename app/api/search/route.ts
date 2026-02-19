import { NextRequest, NextResponse } from 'next/server'
import { searchMovies } from '@/lib/tmdb'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters.' },
      { status: 400 }
    )
  }

  try {
    const data = await searchMovies(query)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[Search API Error]', err)
    return NextResponse.json(
      { error: 'Failed to fetch search results.' },
      { status: 500 }
    )
  }
}
