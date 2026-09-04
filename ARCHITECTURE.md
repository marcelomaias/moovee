# ARCHITECTURE.md

This document describes the concrete implementation of the NextNeonStar boilerplate for use by AI coding agents when extending this codebase.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| React | React 19 + React Compiler | 19.x |
| Auth | Better Auth | 1.4.x |
| ORM | Drizzle ORM | 0.45.x |
| Database | PostgreSQL (Neon Serverless) via `pg` Pool | 8.x |
| UI | shadcn/ui (New York style) + Radix UI + Tailwind CSS v4 | — |
| File Upload | UploadThing | 7.x |
| Email | Resend | 6.x |
| Theming | next-themes | 0.4.x |
| Deployment target | Vercel | — |

## Path Aliases

Defined in `tsconfig.json`:

```
@/* → ./src/*
```

All imports use `@/` (e.g., `@/lib/auth/server`, `@/components/ui/button`).

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── auth/[...all]/  # Better Auth catch-all API handler
│   │   └── uploadthing/    # UploadThing route handler + file router definition
│   ├── account/            # Protected account page (server component)
│   ├── admin/              # Admin dashboard (server component + server actions)
│   ├── sign-in/            # Email/password sign-in (client component)
│   ├── sign-up/            # Email/password sign-up (client component)
│   ├── forgot-password/    # Password reset request (client component)
│   ├── reset-password/     # Password reset form with token (client component)
│   ├── layout.tsx          # Root layout (theme, font, navbar, UploadThing SSR)
│   ├── page.tsx            # Homepage with DB connection check
│   ├── globals.css         # Tailwind v4 config + CSS variables (light/dark)
│   ├── fonts.js            # Inter font configuration
│   ├── error.tsx           # Global error boundary (client component)
│   ├── not-found.tsx       # 404 page (server component)
│   └── loading.tsx         # Global loading spinner (server component)
├── components/
│   ├── account/            # Account management client components
│   │   ├── avatar-upload.tsx
│   │   ├── change-email-form.tsx
│   │   ├── change-name-form.tsx
│   │   └── change-password-form.tsx
│   ├── themes/
│   │   ├── provider.tsx    # next-themes ThemeProvider wrapper
│   │   └── selector.tsx    # Light/dark/system dropdown toggle
│   ├── ui/                 # shadcn/ui primitives (button, input, label, dropdown-menu)
│   └── navbar.tsx          # Global navbar with session-aware user menu
├── lib/
│   ├── auth/
│   │   ├── server.ts       # Better Auth server instance (the source of truth for auth config)
│   │   ├── client.ts       # Better Auth React client (useSession, signIn, signUp, signOut)
│   │   ├── schema.ts       # Drizzle schema for auth tables (user, session, account, verification)
│   │   └── permissions.ts  # requireUser() and requireAdmin() server-side guards
│   ├── db/
│   │   └── client.ts       # Drizzle + pg Pool setup, Vercel serverless pool attachment
│   ├── email/
│   │   └── resend.ts       # Resend client instance
│   ├── uploadthing.ts      # Typed UploadButton and UploadDropzone exports
│   └── utils.ts            # cn() helper (clsx + tailwind-merge)
├── proxy.ts                # Next.js 16 middleware (replaces old middleware.ts) — route protection
drizzle/                    # Generated SQL migrations
├── 0000_fast_omega_sentinel.sql
├── 0001_even_scalphunter.sql
└── meta/_journal.json
public/                     # Static assets (logos, icons)
```

## Authentication Architecture

### Better Auth Server Config

**File:** `src/lib/auth/server.ts`

The single `auth` instance is created via `betterAuth()` with:

- **Database adapter:** `drizzleAdapter(db, { provider: "pg" })` — Better Auth manages its own table creation/migration through this adapter.
- **Email + password auth:** enabled, with a `sendResetPassword` callback that sends a reset email via Resend.
- **Email change:** enabled with `updateEmailWithoutVerification: true`.
- **Plugins:**
  - `admin()` — adds `role`, `banned`, `banReason`, `banExpires` fields to the user model; provides impersonation and ban management APIs.
  - `nextCookies()` — **must be last** in the plugins array. Integrates Better Auth session cookies with Next.js.

### Better Auth Client Config

**File:** `src/lib/auth/client.ts`

A `"use client"` module that exports:
- `authClient` — the typed client instance with `adminClient()` plugin
- Convenience exports: `signIn`, `signUp`, `signOut`, `useSession`

### API Route

**File:** `src/app/api/auth/[...all]/route.ts`

A single catch-all route that delegates all Better Auth endpoints (sign-in, sign-up, sign-out, session, password reset, email change, admin APIs) to `toNextJsHandler(auth)`. Exports `GET` and `POST`.

### Extending Auth

To add OAuth providers or new auth features:

1. Add the provider plugin to `src/lib/auth/server.ts` in the `plugins` array (before `nextCookies()`).
2. Add the corresponding client plugin to `src/lib/auth/client.ts`.
3. If the feature affects the schema, run `pnpm auth:generate` to regenerate `src/lib/auth/schema.ts` from the updated config, review the diff, then `pnpm db:generate && pnpm db:migrate`.
4. If the provider needs client-side buttons, create them in a new component using `authClient.signIn.social({ provider: "..." })`.

**Do not hand-edit `src/lib/auth/schema.ts`.** It is generated by `pnpm auth:generate`. Always regenerate it after changing the Better Auth config, then review the output before creating a migration.

## Route Protection

### Server-Side Guards

**File:** `src/lib/auth/permissions.ts`

Two functions used in server components and server actions:

- **`requireUser()`** — calls `auth.api.getSession()` with request headers. Redirects to `/sign-in` if no session. Returns the session object.
- **`requireAdmin()`** — calls `requireUser()`, then checks `session.user.role !== "admin"`. Redirects to `/` if not admin.

**Usage pattern in server components:**

```tsx
import { requireUser } from "@/lib/auth/permissions";

export default async function MyPage() {
  const session = await requireUser(); // redirects if unauthenticated
  // session.user is available
}
```

**Usage pattern in server actions:**

```ts
"use server";
import { requireAdmin } from "@/lib/auth/permissions";

export async function myAdminAction() {
  await requireAdmin(); // throws redirect if not admin
  // proceed with admin logic
}
```

### Middleware (Next.js 16 proxy.ts)

**File:** `src/proxy.ts`

In Next.js 16, `src/proxy.ts` replaces the old root-level `middleware.ts`. This file **is active** and runs on every matched request.

Exports:
- **`proxy(request)`** — the middleware function. Checks for a Better Auth session cookie via `getSessionCookie(request)` and redirects:
  - Unauthenticated users away from `/account` and `/admin` → `/sign-in`
  - Authenticated users away from `/sign-in` and `/sign-up` → `/account`
- **`config`** — route matcher config:
  ```ts
  matcher: ["/account/:path*", "/admin/:path*", "/sign-in", "/sign-up"]
  ```

This provides request-level redirect protection before the page renders. Server-side guards in `src/lib/auth/permissions.ts` (`requireUser()`, `requireAdmin()`) provide the security boundary for protected server components and server actions. Use both: the proxy prevents unauthenticated users from even loading the page; the server guards protect individual data fetches and actions.

## Database / Neon / Drizzle

### Connection Setup

**File:** `src/lib/db/client.ts`

- Creates a `pg.Pool` connected via `DATABASE_URL`.
- Calls `attachDatabasePool(pool)` from `@vercel/functions` for Vercel serverless connection pool management.
- Creates a Drizzle instance with all schema modules: `drizzle(pool, { schema: { ...authSchema } })`.
- Exports a `checkDbConnection()` health check function used on the homepage.

### Drizzle Schema

**File:** `src/lib/auth/schema.ts`

Four tables defined with `pgTable()`:

| Table | Purpose |
|-------|---------|
| `user` | Core user record. Fields: `id` (text PK), `name`, `email` (unique), `emailVerified`, `image`, `role`, `banned`, `banReason`, `banExpires`, `createdAt`, `updatedAt` |
| `session` | Active sessions. Fields: `id`, `expiresAt`, `token` (unique), `ipAddress`, `userAgent`, `userId` (FK→user, cascade delete), `impersonatedBy` |
| `account` | Linked auth providers. Fields: `id`, `accountId`, `providerId`, `userId` (FK→user, cascade delete), OAuth tokens, `password` (for email/password), `issuer` |
| `verification` | Temp tokens for password reset, email verification. Fields: `id`, `identifier`, `value`, `expiresAt` |

Relations defined: `user` has many `sessions` and `accounts`; `session` and `account` each belong to one `user`.

Indexes: `session_userId_idx`, `account_userId_idx`, `verification_identifier_idx`.

### Drizzle Config

**File:** `drizzle.config.ts`

- Schema source: `./src/lib/*/schema.ts` (glob pattern — any `schema.ts` inside `src/lib/<module>/` is included).
- Migrations output: `./drizzle/`
- Dialect: `postgresql`
- Credentials from `DATABASE_URL` env var.

### Adding New Schema Tables

1. Create a new file at `src/lib/<module>/schema.ts` (e.g., `src/lib/posts/schema.ts`).
2. Define tables using `pgTable()` from `drizzle-orm/pg-core`.
3. Add relations using `relations()` from `drizzle-orm`.
4. Import and spread the new schema into `src/lib/db/client.ts`:
   ```ts
   import * as postsSchema from "@/lib/posts/schema";
   export const db = drizzle(pool, { schema: { ...authSchema, ...postsSchema } });
   ```
5. Run `pnpm db:generate` to create the SQL migration.
6. Run `pnpm db:migrate` to apply it.

### Migrations

**Directory:** `drizzle/`

SQL files named with a sequential index and random tag (Drizzle Kit convention). The `meta/_journal.json` tracks migration order. Current migrations:

- `0000` — creates the four auth tables (user, session, account, verification)
- `0001` — adds `issuer` column to `account`

## Server/Client Component Boundaries

### Server Components (default, no directive)

- `src/app/layout.tsx` — root layout
- `src/app/page.tsx` — homepage (calls `checkDbConnection()`)
- `src/app/not-found.tsx` — 404 page
- `src/app/loading.tsx` — loading spinner
- `src/app/account/page.tsx` — calls `requireUser()` server-side, renders account management
- `src/app/admin/page.tsx` — calls `requireAdmin()`, queries users via Drizzle directly

### Client Components (`"use client"`)

- `src/app/error.tsx` — error boundary (requires `reset()` callback)
- `src/app/sign-in/page.tsx` — uses `signIn.email()` from auth client
- `src/app/sign-up/page.tsx` — uses `signUp.email()` from auth client
- `src/app/forgot-password/page.tsx` — uses `authClient.requestPasswordReset()`
- `src/app/reset-password/page.tsx` — uses `authClient.resetPassword()`, wraps form in `<Suspense>` (required for `useSearchParams()`)
- `src/components/navbar.tsx` — uses `useSession()` for session-aware rendering
- `src/components/themes/provider.tsx` — wraps `next-themes`
- `src/components/themes/selector.tsx` — theme toggle dropdown
- `src/components/account/*.tsx` — all account management forms
- `src/app/admin/user-list.tsx` — user management list with role changes and deletion

### Server Actions

- `src/app/admin/actions.ts` — `"use server"` functions `deleteUser()` and `updateUserRole()`. Both call `requireAdmin()` internally for security. Use `revalidatePath("/admin")` to refresh the page after mutations.

## Important Components

### NavBar

**File:** `src/components/navbar.tsx`

Client component rendered in the root layout. Session-aware:
- **Loading state:** shows disabled "Loading..." button
- **Authenticated:** shows user avatar (or initial) + name/email dropdown with "Account" link and "Sign Out" action
- **Unauthenticated:** shows "Sign In" button linking to `/sign-in`

### Account Components

All in `src/components/account/`:

- **`avatar-upload.tsx`** — UploadThing `UploadButton` for profile image. On upload complete, updates the user's `image` field via `authClient.updateUser()`, then refetches the session and refreshes the router.
- **`change-name-form.tsx`** — form calling `authClient.updateUser({ name })`.
- **`change-email-form.tsx`** — form calling `authClient.changeEmail({ newEmail, callbackURL: "/account" })`.
- **`change-password-form.tsx`** — form calling `authClient.changePassword()` with `revokeOtherSessions: true`. Handles `INVALID_PASSWORD` and `SESSION_NOT_FRESH` error codes.

### shadcn/ui Components

**Config:** `components.json` — New York style, neutral base color, CSS variables enabled, Lucide icons.

Installed components in `src/components/ui/`:
- `button.tsx` — variants: default, destructive, outline, secondary, ghost, link; sizes: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
- `input.tsx`
- `label.tsx`
- `dropdown-menu.tsx`

Add new components via: `pnpm dlx shadcn@latest add <component-name>`

## File Upload (UploadThing)

### Route Handler

**File:** `src/app/api/uploadthing/route.ts`

Standard UploadThing route handler using `createRouteHandler()`.

### File Router

**File:** `src/app/api/uploadthing/core.ts`

Defines `imageUploader` endpoint:
- **Constraints:** images only, 1MB max, 1 file per upload.
- **Middleware:** requires authentication via `auth.api.getSession()`. Throws `UploadThingError("Unauthorized")` if no session. Returns `userId` and `currentImage` URL.
- **On complete:** extracts the old image key from `metadata.currentImage`, deletes it via `UTApi.deleteFiles()`, then returns `{ uploadedBy }`.

### Client Integration

**File:** `src/lib/uploadthing.ts`

Exports typed `UploadButton` and `UploadDropzone` components generated from the `OurFileRouter` type.

**Root layout** (`src/app/layout.tsx`) includes `<NextSSRPlugin>` with `extractRouterConfig(ourFileRouter)` for SSR upload state hydration.

### Extending UploadThing

To add new upload endpoints:
1. Add a new entry to `ourFileRouter` in `src/app/api/uploadthing/core.ts`.
2. Add corresponding `UploadButton`/`UploadDropzone` exports in `src/lib/uploadthing.ts` if needed (they're already generic via the router type).

## Email (Resend)

**File:** `src/lib/email/resend.ts`

Single `Resend` client instance using `RESEND_API_KEY`.

Currently used only for password reset emails in `src/lib/auth/server.ts`. The `sendResetPassword` callback sends a plain HTML email with a reset link.

### Adding Transactional Emails

1. Create a new file at `src/lib/email/<template>.ts`.
2. Import `resend` from `@/lib/email/resend`.
3. Call `resend.emails.send({ from, to, subject, html })`.

## Theming

- **Provider:** `src/components/themes/provider.tsx` wraps `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- **Selector:** `src/components/themes/selector.tsx` — dropdown with Light/Dark/System options.
- **CSS variables:** defined in `src/app/globals.css` for both `:root` (light) and `.dark` (dark mode). Uses oklch color space. Standard shadcn/ui variable names (`--background`, `--foreground`, `--primary`, etc.).
- **Tailwind v4:** configured via `@theme inline` block in CSS (no `tailwind.config.ts`). Custom dark variant: `@custom-variant dark (&:is(.dark *))`.

## Environment Variables

**File:** `.env.example`

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (used by Drizzle config and pg Pool) |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth session signing (min 32 chars, generate via `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Base URL of the app (e.g., `http://localhost:3000` or production Vercel URL) |
| `RESEND_API_KEY` | For email | Resend API key for transactional emails (password reset) |
| `UPLOADTHING_SECRET` | For uploads | UploadThing API secret (server-side) |
| `UPLOADTHING_APP_ID` | For uploads | UploadThing app ID |

The `.env` file is gitignored. Copy `.env.example` to `.env` for local development.

## Database Scripts

From `package.json`:

| Script | Command | Purpose |
|--------|---------|---------|
| `db:generate` | `drizzle-kit generate` | Generate SQL migration files from schema changes |
| `db:migrate` | `drizzle-kit migrate` | Apply pending migrations to the database |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio (browser-based DB explorer) |
| `auth:generate` | `npx @better-auth/cli@latest generate ...` | Regenerate `src/lib/auth/schema.ts` from Better Auth config |

### Migration Workflow

1. Modify schema in `src/lib/<module>/schema.ts`.
2. Run `pnpm db:generate` — creates a new SQL file in `drizzle/`.
3. Inspect the generated SQL.
4. Run `pnpm db:migrate` to apply.

If you change Better Auth's schema (user fields, etc.), regenerate the auth schema first with `pnpm auth:generate`, then run `pnpm db:generate`.

## Build Configuration

**File:** `next.config.ts`

```ts
const nextConfig: NextConfig = {
  reactCompiler: true, // Enables React Compiler (automatic memoization)
};
```

**File:** `postcss.config.mjs` — uses `@tailwindcss/postcss` plugin (Tailwind v4 approach).

**File:** `tsconfig.json` — targets ES2017, strict mode, bundler module resolution, incremental builds.

## Adding New Features

### New Protected Page

1. Create `src/app/<route>/page.tsx`.
2. Call `requireUser()` or `requireAdmin()` at the top of the server component for server-side protection.
3. If the route also needs middleware-level protection (redirect before page load), add it to the `protectedRoutes` array in `src/proxy.ts`.

### New Database Table

1. Create `src/lib/<module>/schema.ts` with `pgTable()` definitions and `relations()`.
2. Spread into `db` schema in `src/lib/db/client.ts`.
3. Generate and apply migration: `pnpm db:generate && pnpm db:migrate`.

### New Server Action

1. Create or edit a `"use server"` file.
2. Call `requireUser()` or `requireAdmin()` at the top for auth enforcement.
3. Use `db` from `@/lib/db/client` for database operations.
4. Call `revalidatePath()` after mutations to refresh cached pages.

### New API Route

Create `src/app/api/<route>/route.ts` with exported `GET`, `POST`, etc. functions. For auth-protected routes, verify the session via `auth.api.getSession({ headers: await headers() })`.

## Key Conventions

- Route protection uses two layers: `src/proxy.ts` (Next.js 16 middleware) handles redirects before page load, while `requireUser()`/`requireAdmin()` in `src/lib/auth/permissions.ts` guard server components and actions.
- The `admin` plugin fields (`role`, `banned`, `banReason`, `banExpires`) are on the `user` table. Use `role` for RBAC.
- The Drizzle schema at `src/lib/auth/schema.ts` is auto-generated by Better Auth CLI — prefer `pnpm auth:generate` over manual edits to keep it in sync with the auth config.
- UploadThing handles avatar cleanup automatically — old profile images are deleted when a new one is uploaded.
- The root layout renders `<NavBar />` globally on every page.
