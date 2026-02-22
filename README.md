# 🎬 Moovee — Next.js + TMDB

A movies web app built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.

## Features

### ⭐ Hero Banner

A cinematic full-width hero banner highlights a featured film on the home page, with backdrop image, tagline, runtime, and genres.

![Home Hero](https://raw.githubusercontent.com/marcelomaias/moovee/main/public/screenshots/Home_Hero.png)

### 🏠 Home — Popular Movies

Browse a curated grid of popular movies, each showing the poster, title, year, and rating. Hover a card to reveal the favorite button.

![Popular Movies](https://raw.githubusercontent.com/marcelomaias/moovee/main/public/screenshots/Home_Popular_Movies.jpg)

### ❤️ Favorites

Save any movie by clicking the heart icon. Your favorites are persisted to localStorage and shown on their own dedicated page, complete with a hero banner for your top-rated pick.

![Favorites Page](https://raw.githubusercontent.com/marcelomaias/moovee/main/public/screenshots/Favorites_Page.jpg)

### 🎥 Movie Detail Modal

Click any movie card to open a rich detail modal with backdrop, poster, genres, overview, director, and the top cast members with their profile photos.

![Movie Info Modal](https://raw.githubusercontent.com/marcelomaias/moovee/main/public/screenshots/Movie_Info_Modal.png)

### 🔍 Debounced Search

Search across the TMDB catalog in real time — results update as you type with a 400ms debounce, and a spinner shows while the request is in flight.

---

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

---

## Project Structure

```
/app
  page.tsx                  → Home (Server Component, ISR)
  layout.tsx                → Root layout
  globals.css               → Tailwind + global styles
  /favorites/page.tsx       → Favorites page (Client Component)
  /api/search/route.ts      → Search Route Handler (GET)
  /actions/getMovieDetails  → Server Action for movie details
  /components
    Navbar.tsx              → Sticky top nav with MAIN / FAVORITES links
    Hero.tsx                → Cinematic backdrop banner
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

---

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
