# 🎬 Moovee — Next.js + TMDB

A movies web app built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

## Features

- Popular movies listed on home page (ISR-cached, fast first load)
- Movie cards with title, genre, year, and rating
- Favorite any movie — saved to localStorage
- Click a card to open a detailed modal with backdrop, cast, and director
- Debounced search via TMDB's search API
- API key is 100% server-side — never exposed to the browser

## Getting Started

### 1. Get a TMDB API key

Sign up at [themoviedb.org](https://www.themoviedb.org/) → Settings → API.
Use the **"API Read Access Token"** (Bearer token), not the v3 key.

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Paste your Bearer token into `.env.local`:

```
TMDB_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiJ9...
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/app
  page.tsx                  → Home (Server Component, ISR)
  layout.tsx                → Root layout
  globals.css               → Tailwind + global styles
  /api/search/route.ts      → Search Route Handler (GET)
  /actions/getMovieDetails  → Server Action for movie details
  /components
    MovieGrid.tsx           → Client orchestrator (search, grid, modal)
    MovieCard.tsx           → Individual movie card
    MovieModal.tsx          → Detail modal
    MovieGridSkeleton.tsx   → Suspense fallback
    SearchBar.tsx           → Debounced search input
    FavoriteButton.tsx      → Heart toggle button
/lib
  tmdb.ts                   → TMDB fetch helpers + image util
  favorites.ts              → localStorage utilities
  types.ts                  → TypeScript types + genre map
/hooks
  useFavorites.ts           → Favorites state + toggle
  useMovieSearch.ts         → Debounced search state
```

## Architecture Decisions

| Concern          | Approach                     | Why                                        |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Home data fetch  | Async Server Component       | Pre-rendered HTML, no spinner, ISR cache   |
| API key security | Server-only env var          | Never sent to the browser                  |
| ISR caching      | `next: { revalidate: 3600 }` | Fresh data hourly, no cold fetches         |
| Search           | Route Handler + debounce     | GET semantics, keeps key server-side       |
| Movie details    | Server Action                | Triggered on demand, key stays server-side |
| Favorites        | localStorage + React state   | No backend needed, instant updates         |
| Hydration safety | `useEffect` initialization   | Prevents SSR/client mismatch               |
