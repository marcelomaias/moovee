# AGENTS.md

Instructions for AI coding agents working on this codebase. Read `ARCHITECTURE.md` for full implementation details.

## Stack

Next.js 16 (App Router) · React 19 · React Compiler · Better Auth · Drizzle ORM · PostgreSQL via Neon · Tailwind CSS v4 · shadcn/ui (New York) · UploadThing · Resend · Vercel

Path alias: `@/*` → `./src/*`

## Source of Truth

When information conflicts:

1. The actual source code is the source of truth for current behavior.
2. `AGENTS.md` defines rules and constraints for AI agents.
3. `ARCHITECTURE.md` documents how the current implementation works.
4. `README.md` provides human-facing project documentation.

If the code and documentation disagree, follow the code, then update the documentation if the discrepancy represents an intentional change.

## Before Modifying Any Subsystem

Do not modify a subsystem based only on the instructions in this file. Inspect the relevant implementation files first. If the implementation differs from this document, treat the code as the source of truth and update the documentation when appropriate.

Read these files to understand the existing implementation:

| Area | Files |
|------|-------|
| Auth (server) | `src/lib/auth/server.ts` |
| Auth (client) | `src/lib/auth/client.ts` |
| Auth (schema) | `src/lib/auth/schema.ts` |
| Auth (guards) | `src/lib/auth/permissions.ts` |
| Database client | `src/lib/db/client.ts` |
| Drizzle config | `drizzle.config.ts` |
| Route protection | `src/proxy.ts` |
| UploadThing | `src/app/api/uploadthing/core.ts`, `src/lib/uploadthing.ts` |
| Root layout | `src/app/layout.tsx` |
| Navbar | `src/components/navbar.tsx` |

## Rules

### Authentication

- **Better Auth is the auth system.** Do not introduce a separate auth library, session strategy, or JWT handling.
- **`src/lib/auth/server.ts`** is the single source of truth for auth config. All server-side auth goes through the `auth` export from this file.
- **`src/lib/auth/client.ts`** is the client counterpart. All client-side auth (`signIn`, `signOut`, `useSession`, `authClient.*`) comes from here.
- **`nextCookies()` plugin must remain last** in the `plugins` array in `src/lib/auth/server.ts`.
- **`src/lib/auth/schema.ts` is auto-generated** by `pnpm auth:generate`. Never manually modify it. Changes to Better Auth configuration that affect the schema must be reflected by running `pnpm auth:generate`, then reviewing the generated changes before creating a migration.
- **`admin()` plugin** provides the `role` field on the `user` table. Use `role` for RBAC, not a custom field.
- **Auth API route** is the catch-all at `src/app/api/auth/[...all]/route.ts`. Do not create competing auth endpoints.

### Route Protection (Two Layers)

1. **`src/proxy.ts`** — Next.js 16 middleware. Redirects unauthenticated users away from protected routes before the page loads. Add new protected route prefixes to the `protectedRoutes` array and `config.matcher`.
2. **`src/lib/auth/permissions.ts`** — `requireUser()` and `requireAdmin()` for server components and server actions. Always call these at the top of protected server code. Do not skip this even if the proxy covers the route.

### Database

- **Single connection pool** in `src/lib/db/client.ts`. Do not create additional `pg.Pool` or `drizzle()` instances.
- **Schema files** live at `src/lib/<module>/schema.ts`. The drizzle config glob `./src/lib/*/schema.ts` picks them up automatically.
- **When adding a new schema file**, spread it into the `db` schema object in `src/lib/db/client.ts`.
- **Migration workflow:** edit schema → `pnpm db:generate` → inspect SQL → `pnpm db:migrate`.
- **Never hand-edit SQL in `drizzle/`**. Always regenerate.

### UI Components

- **shadcn/ui** is the component library (New York style, `components.json`).
- Add new primitives with: `pnpm dlx shadcn@latest add <name>`
- Use `cn()` from `@/lib/utils` for class merging (it wraps `clsx` + `tailwind-merge`).
- **Tailwind v4** — no `tailwind.config.ts`. Theme tokens are CSS custom properties in `src/app/globals.css`. Dark mode uses the `.dark` class.

### Server vs. Client Components

- Pages are **server components by default**. Only add `"use client"` when the component needs hooks, event handlers, or browser APIs.
- Client pages that use `useSearchParams()` must wrap in `<Suspense>` (see `src/app/reset-password/page.tsx` for the pattern).
- Auth checks (`requireUser`, `requireAdmin`) only work in server components or `"use server"` actions.

### Server Actions

- Place in `"use server"` files next to the page that uses them (e.g., `src/app/admin/actions.ts`).
- **Always call `requireUser()` or `requireAdmin()` at the top** of every server action for auth enforcement.
- Use `revalidatePath()` after mutations.

### File Uploads (UploadThing)

- File router is at `src/app/api/uploadthing/core.ts`.
- The `imageUploader` endpoint is auth-gated in its middleware function. New endpoints should do the same.
- Client-side typed components are exported from `src/lib/uploadthing.ts`.
- The root layout includes `<NextSSRPlugin>` — do not remove it.

### Email (Resend)

- Client instance at `src/lib/email/resend.ts`.
- Only used for password reset currently. New transactional emails: create `src/lib/email/<template>.ts`, import `resend`, call `resend.emails.send()`.

## Testing

- **Vitest** (`pnpm test:unit`) covers auth integration, RBAC guards, server actions, and the DB client. Unit tests live **colocated** next to the code as `*.test.ts`; shared fixtures import from `@/` and `@test/` (alias → `./tests/*`).
- **Playwright** (`pnpm test:e2e`) runs in `tests/e2e/` against a real app server on **port 3100**.
- Tests never touch the dev/prod database. `.env.test` (gitignored) defines a dedicated test `DATABASE_URL` on a separate Neon branch, plus `BETTER_AUTH_URL=http://localhost:3100` and a dummy `RESEND_API_KEY`. Both configs load `.env.test` before any app module is imported.
- Seeding and fixtures live in `tests/helpers/seed.ts` and use the real Better Auth flow (sign-up via `auth.api.signUpEmail`, session cookies via `auth.handler` on `/api/auth/sign-in/email`).
- Playwright's `globalSetup` seeds via a child `node --import tsx` process because Playwright's loader does **not** resolve tsconfig `paths` — keep global-setup free of `@/` imports.
- Assert **user-visible outcomes**, never Better Auth internals or raw network timing:
  - `signUpEmail` auto-signs-in; after a UI sign-up the user is already authenticated.
  - Sign-out only deletes the session matching the cookie; don't assert "zero sessions for the user".
  - Don't navigate immediately after clicking an async action (e.g., "Sign Out") — wait for the observable state (navbar "Sign In" link).

## Do Not

- Do not replace Better Auth with NextAuth, Lucia, or custom session handling.
- Do not create a second database connection or Drizzle instance.
- Do not manually edit `src/lib/auth/schema.ts` — use `pnpm auth:generate`.
- Do not remove `nextCookies()` from the auth plugins.
- Do not remove `requireUser()`/`requireAdmin()` calls from protected server code.
- Do not add a `tailwind.config.ts` — this project uses Tailwind v4 CSS-based config.
- Do not add a root `middleware.ts` — this project uses Next.js 16's `src/proxy.ts`.
- Do not introduce UI component libraries beyond shadcn/ui (e.g., do not add Material UI, Chakra, or Ant Design).
- Do not duplicate the `cn()` utility — use `@/lib/utils`.
- Do not hardcode auth secrets, database URLs, or API keys in source files.

## General

- Prefer the existing patterns and utilities over introducing new abstractions.
- Do not refactor unrelated code while implementing a feature.
- Do not introduce new dependencies when the existing stack can handle the requirement.
- Keep changes scoped to the requested feature.

## Verification

After making changes:

1. Run the relevant type checks/build/tests available in the project.
2. If database schema changes were made, inspect the generated migration before applying it.
3. Do not claim a change is complete if the project has not been successfully type-checked/build-tested when those checks are available.

## Adding New Features (Recipes)

### New protected page

1. Create `src/app/<route>/page.tsx` as a server component.
2. Call `const session = await requireUser();` at the top.
3. Add the route prefix to `protectedRoutes` in `src/proxy.ts` and to `config.matcher`.

### New database table

1. Create `src/lib/<module>/schema.ts` with `pgTable()` + `relations()`.
2. Spread into `db` schema in `src/lib/db/client.ts`.
3. `pnpm db:generate && pnpm db:migrate`.

### New server action

1. Create `"use server"` function in a file beside the page.
2. Call `requireAdmin()` or `requireUser()` first.
3. Query via `db` from `@/lib/db/client`.
4. `revalidatePath()` after writes.

### New API route

Create `src/app/api/<route>/route.ts`. Export `GET`/`POST`/etc. For auth-protected API routes, use the existing Better Auth server configuration and session utilities. When directly checking a session in a route handler, use `auth.api.getSession({ headers: await headers() })`.

### New shadcn/ui component

Run `pnpm dlx shadcn@latest add <component-name>`. It installs to `src/components/ui/`.
