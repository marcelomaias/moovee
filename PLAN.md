# Moovee — Collaborative Movie Rooms: Implementation Plan

> Living document. Update this file as decisions change. Do **not** implement any phase until it is reviewed.

## Decisions locked in from Q&A

- **Invites** are internal: the owner searches a user by **name or email**, sends an invite that shows up on that user's **Account page**. Invites **expire after N days** (default 7) but otherwise persist until accepted or declined.
- **Queue** is an **ordered** watch queue plus a **history** (viewed) list. "Watch Next" is simply the head of the queue.
- **Ownership** is the **creator is sole owner**, with no transfer. Owner manages settings, members, and the queue.
- **The Room has ONE shared watch state.** No per-member watched state, and no `queueEntryWatch` table. There is a single shared queue and a single shared history, both identical for every member. When any member marks a movie watched, that movie is immediately watched for the whole Room. `watchedById` is audit-only.

---

## Phase 0 — Safety guardrails (read before any implementation)

Phase 1 through 7 are purely additive (`CREATE TABLE`/index/FK on new tables). But the surrounding workflow can destroy existing user data if these are violated:

1. **Do NOT run `pnpm auth:generate` or upgrade `better-auth`/`drizzle-orm` while implementing.** `src/lib/auth/schema.ts` is auto-generated; if it drifts from the DB snapshot, the next `db:generate` will emit destructive `ALTER ... DROP COLUMN` / `DROP TABLE` against `user`/`account`/`session`/`verification`, and `db:migrate` will apply it — deleting users.
2. **Inspect every generated migration (mandatory).** Auth tables (`user`, `account`, `session`, `verification`) must appear ONLY as new `FOREIGN KEY ... REFERENCES "user"` lines in the new SQL. Any `ALTER`/`DROP`/`CREATE INDEX` touching them means drift — halt and investigate, do not migrate.
3. **Never hand-edit or delete anything in `drizzle/`**, including `drizzle/meta/*.json`. Those snapshots keep `generate` additive; losing them flips it into "reconcile from scratch" mode, which can emit drops of existing tables.
4. **Mind `DATABASE_URL`.** `db:migrate` applies to whatever `.env` points at; `.env.test` is a separate Neon branch (`test:db:migrate`). Do not apply a migration to a branch/environment you don't intend (dev/test/prod).
5. **FK direction.** Our new tables get `ON DELETE CASCADE` on their FKs to `user` (child side) — deleting a user cleans up their room rows, which is inert to user data. Never add a FK *from* `user` to a rooms table.
6. The workflow uses `drizzle-kit migrate`, not `push`, so nothing diffs against the live DB during generate — but the generated SQL is still the authority; if it isn't additive, stop.

---

## 1. Database model

New schema file: `src/lib/rooms/schema.ts` (auto-picked up by the drizzle glob `./src/lib/*/schema.ts`; spread into `db` in `client.ts`).

### TMDB movie persistence decision

We **do not** persist a copy of the full TMDB movie record in our own table. Movies are referenced by **`tmdbId` (int)**. We persist only the minimal denormalized display fields (title, poster path, year) needed to render room lists without a TMDB round-trip. Anything richer (overview, credits, runtime) is fetched live via the existing `getMovieDetails()` when a modal is opened — the app already does this.

### Tables

**`room`**
- `id` (text, UUID PK — generated in app via `crypto.randomUUID()` to match Better Auth's `text` PK style)
- `name` (text, notNull) — required, input field
- `description` (text, nullable) — optional, textarea field
- `approvalMode` (text, notNull, default `'majority'`) — `'majority' | 'unanimous' | 'percentage'`
- `approvalThreshold` (int, nullable) — used only when `approvalMode = 'percentage'` (e.g. `60` = 60%). `null` for majority/unanimous.
- `ownerId` (text FK → `user.id`, notNull)
- `createdAt`, `updatedAt`

**`roomMember`** (many-to-many: user ↔ room)
- `id` (text PK)
- `roomId` (text FK → `room.id`, cascade delete)
- `userId` (text FK → `user.id`, cascade delete)
- `role` (text, default `'member'`) — currently only `'owner'` in practice, but storing role allows admin members later. Keep minimal: `'owner' | 'member'`.
- `joinedAt` (timestamp)
- **Unique constraint on `(roomId, userId)`** — prevents duplicate membership.
- Index on `roomId`, index on `userId`.

Note: `ownerId` on `room` is redundant with `roomMember.role='owner'`, but it makes the common "is this user the owner" check a fast single-column lookup and avoids a join on every authorization. Keep both; enforce consistency in code (owner is always a member).

**`roomInvite`**
- `id` (text PK)
- `roomId` (text FK → `room.id`, cascade delete)
- `invitedUserId` (text FK → `user.id`, cascade delete) — the user who sees the request on their account page
- `invitedById` (text FK → `user.id`, notNull) — the owner who sent it
- `status` (text, default `'pending'`) — `'pending' | 'accepted' | 'declined'`
- `expiresAt` (timestamp, notNull) — computed as `now + N days` at creation; default 7 days
- `createdAt`
- **Unique constraint on `(roomId, invitedUserId)`** — prevents duplicate pending invites; re-inviting reuses/refreshes the existing row.
- Index on `invitedUserId`.

**`suggestion`** (a movie proposed by a member)
- `id` (text PK)
- `roomId` (text FK → `room.id`, cascade delete)
- `suggestedById` (text FK → `user.id`) — who suggested it
- `tmdbId` (int, notNull)
- `title` (text, notNull — denormalized)
- `posterPath` (text, nullable — denormalized)
- `releaseYear` (text, nullable — denormalized)
- `status` (text, default `'pending'`) — lifecycle: `'pending' | 'approved' | 'expired'` (no rejection; see §4/§5)
- `expiresAt` (timestamp, notNull) — **set once at creation** (`now + 7d`); the timer starts when the suggestion is created and is **never reset** by later approvals. Once `expiresAt` passes while still pending, the suggestion is treated as expired (lazily, on read/resolve)
- `suggestedAt` (timestamp)
- Index on `(roomId, status)`.
- **Partial unique index on `(roomId, tmdbId) WHERE status = 'pending'`** — prevents duplicate active suggestions while still allowing a movie to be re-suggested after it expired or was watched (the partial index only covers pending rows).

**`suggestionVote`** (approval records — one per member per suggestion; there is **no rejection vote**)
- `id` (text PK)
- `suggestionId` (text FK → `suggestion.id`, cascade delete)
- `userId` (text FK → `user.id`, cascade delete)
- `createdAt`
- **Unique constraint on `(suggestionId, userId)`** — a member can only approve once; clicking Approve is a no-op upsert. There is no `vote` column and no reject value.

**`queueEntry`** (the ordered watch queue; one row per movie)
- `id` (text PK)
- `roomId` (text FK → `room.id`, cascade delete)
- `tmdbId` (int, notNull)
- `title`, `posterPath`, `releaseYear` (denormalized, notNull/nullable)
- `position` (int, notNull) — ordering. Enforce contiguous ordering in code.
- `addedAt` (timestamp, default now)
- `sourceSuggestionId` (text FK → `suggestion.id`, nullable, **ON DELETE SET NULL**) — links back to the suggestion that produced it; the queue entry survives even if the suggestion row is later removed
- **Unique constraint on `(roomId, tmdbId)`** — a movie can be in the queue at most once.
- **Unique index on `(roomId, position)`** — no two entries share a slot.

**`watchHistory`** (shared Room history — see "ONE shared watch state" above)
- `id` (text PK)
- `roomId` (text FK → `room.id`, cascade delete)
- `tmdbId` (int, notNull)
- `title`, `posterPath`, `releaseYear` (denormalized)
- `watchedById` (text FK → `user.id`) — which member performed the "mark watched" action; **audit-only**, does not affect visibility for other members
- `watchedAt` (timestamp, default now)
- `sourceQueueEntryId` (text FK → `queueEntry.id`, nullable, **ON DELETE SET NULL**) — `markWatched` deletes the queue entry; the history row must survive the delete, so NULL it out rather than cascade-delete or block
- **Unique constraint on `(roomId, tmdbId)`** — a movie is only in history once; there is exactly one history row per movie per Room (re-watching doesn't duplicate).
- Index on `roomId`.

There is **no per-member watched-state table** (no `queueEntryWatch`). A movie is either in the shared active queue or in the shared history — never both, never in either solely for one member.

### User model reuse

Nothing in the auth schema changes. We only add FKs to `user.id` from our new tables. We reuse `user.name` and `user.email` for the member-search / invite-by-name-or-email feature.

---

## 2. Room & membership model

- **Owner**: sole `ownerId` on `room`; always a `roomMember` with `role='owner'`. Can create/own/delete the room, invite/remove members, manage settings and the queue.
- **Members**: everyone else, `role='member'`. Can suggest, approve, mark watched.
- Only two roles needed (`owner`/`member`). Global app-level `requireAdmin()` stays orthogonal to room-level roles.

**Permissions:**
- Create room → `requireUser()`.
- Invite / remove member / change room settings (name, description, approval rule) / delete room / reorder queue / remove queue entries / remove history → `requireUser()` **and** `room.ownerId === session.user.id`.
- Suggest / approve / mark watched → `requireUser()` **and** an active `roomMember`.
- Accept/decline invite → `requireUser()` and `invite.invitedUserId === session.user.id`.
- View room → `requireUser()` and active member (or owner).

Checks live in a small server-side auth helper (see §8) rather than repeated everywhere.

---

## 3. Invitation system

Internal, owner-initiated, surfaced on the invitee's account page.

**Flow:**
1. Owner opens Room members panel → "Invite" → searches users by **name or email** (server action queries `user` with `ILIKE`, excludes users already in the room).
2. Owner selects a user → server action `inviteToRoom(roomId, userId)` creates a `roomInvite` row (`status='pending'`, `expiresAt = now + 7d`).
3. The invitee sees it under **Account → Room Invites**: "You've been invited to {Room} by {owner}".
4. Invitee **accepts** → row set to `accepted`, a `roomMember` row is inserted. Or **declines** → row set to `declined`.
5. **Expiry**: invites with `expiresAt < now` are filtered out of the visible list (treated as inactive). Acceptance refuses expired invites. Lazy expiry on read; no background cron.

**Lifecycle edge cases:**
- Re-inviting a user with a pending invite refreshes `expiresAt` (upsert on the unique `(roomId, invitedUserId)`).
- Already a member → no invite (owner search excludes them).
- Invitee has no account → owner cannot invite them via name/email search. Adding an email-invite path (via existing Resend setup) is out of scope for v1.

---

## 4. Movie suggestion & approval flow

**Lifecycle:**
```
TMDB search → suggest (member) → pending
   → members approve (no reject votes)
   → approvals reach threshold → approved → queueEntry (inserted at end) → watched → watchHistory
   → expiresAt passes while still pending → expired (lazily, on read/resolve)
```

**Flow details:**
1. **Search**: reuse the existing `GET /api/search` route and `searchMovies()` — already public and works for authenticated and unauthenticated users. Member opens a movie → "Suggest to Room" → server action `suggestMovie(roomId, tmdbId)`.
2. **Suggest**: server action looks up the movie via TMDB (`getMovieDetails`), inserts a `suggestion` row (denormalized title/poster/year, `status='pending'`, `expiresAt = now + 7d`), and the suggester auto-approves (their approval counts toward the threshold).
3. **Approve**: members approve through a server action; each member's approval is a single `suggestionVote` row (unique `(suggestionId, userId)`), so approving twice is a no-op upsert. **There is no reject action.**
4. **Resolution**: each approval triggers a threshold check (§5). On reaching the threshold: create a `queueEntry` (position = max+1), set suggestion `status='approved'`. **If approval is never reached, the suggestion stays pending until `expiresAt` passes, then becomes `expired`.** The `expiresAt` timer starts at creation and is **not** reset by approvals.
5. **Watch queues**: members reorder the queue via server actions; "Watch Next" = the lowest-`position` entry. When **any** member marks a queue entry watched, it is removed from the shared queue and added to the shared `watchHistory` — the movie is then watched for the **entire Room**, visible identically to every member on their next render.

**Edge cases:**
- **Duplicate suggestions**: enforced by the partial unique index on pending `(roomId, tmdbId)`. If a member tries to suggest a movie already pending, they're told it's already suggested (can link to the existing suggestion). Already in queue or history → blocked with "already queued/watched" (see §9 for the approval-side concurrency).
- **Double-approve**: a member's approval is a single row; clicking Approve again is a no-op (upsert on the unique `(suggestionId, userId)`).
- **Expiry is lazy**: no cron. A pending suggestion past `expiresAt` is treated as `expired` on read (hidden from the pending list) and is finalized as `expired` the next time it's touched by a resolution attempt. Finalization is enforced by a cheap bulk sweep (see below), not a scheduler.
- **No withdraw (v1 default)**: neither the suggester nor members can cancel a pending suggestion or un-approve an approval. A suggestion either reaches the threshold (approved) or expires — there is no withdrawal action.
- **Members leaving**: their `suggestionVote` rows cascade-delete. Their approval no longer counts, **which changes the required threshold** — see §5. Approved suggestions already in the queue are unaffected (approval is irreversible once in queue).
- **Movies already in queue/history**: the approval transaction re-checks `queueEntry`/`watchHistory` for `(roomId, tmdbId)`; if present, the suggestion resolves as a "duplicate" without inserting a queue row.
- **Shared watch state**: marking a movie watched is a Room-wide action. A member who did not click "Mark as Watched" still sees the movie leave the queue and appear in history — there is no "watched for me but not the Room" state.
- **Suggester leaves before approval**: their approval is removed; suggestion remains pending until remaining members reach the (recomputed) threshold or it expires.

---

## 5. Approval rules

**Threshold formula** with `N` = current active member count and `A` = approval count. **There is no reject path** — a suggestion either reaches the approval threshold or expires:

- **`majority`**: approved when `A > N/2` (strictly more than half).
- **`unanimous`**: approved when `A == N`.
- **`percentage`** (`approvalThreshold = P`): approved when `A / N >= P/100`.

Example (5 members, 60%): 3 approvals → `3/5 >= 0.6` → approved immediately. 0–2 approvals → remains pending, and does so until `expiresAt` passes → expired. No member ever votes "no".

**Design decisions:**
- **`N` = number of current members**; the suggester is a member and their auto-approval counts *(default, confirmed — a lone-member room approves its own suggestion instantly: majority with N=1 → A=1 > 0.5)*.
- `N` is derived at **resolution time** (not stored), so membership changes re-evaluate pending suggestions correctly on the next approval.
- **Expiry is the only exit besides approval.** `suggestion.expiresAt` is set at creation (`now + 7d`, 7 days is the v1 default) and never reset by approvals. A pending suggestion whose `expiresAt` has passed resolves to `expired` (lazily, on read or on the next resolution attempt) — matching the invite-expiry treatment.
- **`approved` is final** once the threshold is met *(default, confirmed — a member leaving after approval does not eject the movie)*.
- **Re-suggestion is allowed** once a suggestion leaves `pending` *(default, confirmed)*: a watched or expired suggestion frees `(roomId, tmdbId)` for the same movie to be suggested again.

Store `approvalMode` + `approvalThreshold` on `room` so it's configurable per room. Threshold validation on save: `percentage` requires `approvalThreshold` in `(1..100)`.

Centralize in one pure function `evaluateApproval(mode, threshold, approvals, memberCount)` and an `isExpired(expiresAt, now)` helper in `src/lib/rooms/approval.ts` with a colocated unit test — this is the highest-risk logic and deserves the one guaranteed check.

---

## 6. TMDB integration

Already well-integrated. **No new TMDB plumbing needed.**
- Public search already works for everyone via `GET /api/search` + `searchMovies()` + `useMovieSearch()`. The existing route is unguarded, so it serves authenticated and unauthenticated users.
- `getMovieDetails()` already powers the detail modal.
- `tmdbImage()` for poster URLs.

**Where TMDB requests live:** entirely in `src/lib/tmdb/` (server-only, token never in browser). The new room "suggest" path calls `getMovieDetails(id)` server-side in a server action to obtain title/poster/year for the denormalized rows. That's the only addition.

---

## 7. Routes / UI structure

Following App Router + server-component-by-default conventions, with proxy + server guards.

**Public, unauthenticated**
- Homepage `/` stays the public movie browser (existing).

**Authenticated (add to `protectedRoutes` + `config.matcher` in `src/proxy.ts`): `/rooms/:path*`**

- `/rooms` — **list** the user's rooms + "Create Room" form. Server component, `requireUser()`.
- `/rooms/new` — create-room form (name, required input; description, optional textarea). Server component + server action.
- `/rooms/[roomId]` — **the room page**. Server component, `requireUser()` + membership check. Tabs/sections:
  - **Watch Now** — queue head ("Watch Next") with "Mark as Watched".
  - **Queue** — ordered list, reorder controls (owner).
  - **Suggestions** — pending list with **Approve** controls (no reject) + "Suggest movie" button (TMDB search modal reusing `MovieGrid`/`MovieModal` patterns but with a room target).
  - **History** — watched movies.
  - **Members** — member list, invite (owner), remove member (owner), settings (owner, name/description/approval rule).

Every member sees the **same** queue and **same** history; "Mark as Watched" mutates the shared state for the whole Room, not just the acting member's view.

**Invites surface**
- **`/account`** — extend the existing account page with a **"Room Invites"** section listing pending invites with Accept/Decline.

**Components** (new, under `src/components/rooms/`):
- `room-card.tsx`, `room-list.tsx`
- `create-room-form.tsx`
- `room-view.tsx` (tabbed layout)
- `queue-list.tsx`, `queue-item.tsx`
- `suggestion-list.tsx`, `suggestion-item.tsx`
- `suggest-movie-dialog.tsx` (TMDB search + suggest)
- `invite-members.tsx` (name/email search + send invite), `member-list.tsx`
- `room-invites.tsx` (account page section)
- `room-settings.tsx`

Reuse existing shadcn primitives (dialog, button, input, dropdown-menu). Add primitives via `pnpm dlx shadcn@latest add` only as needed (e.g. `tabs`, `select`, `badge`, `alert`).

---

## 8. Server-side operations

**New auth helper** `src/lib/rooms/auth.ts`:
- `requireRoomMember(roomId)` → returns `{ session, room, membership }` after `requireUser()` + membership check; redirect if not a member.
- `requireRoomOwner(roomId)` → same but requires `role === 'owner'`.

**Server actions** (`src/app/rooms/actions.ts` — one `"use server"` file beside the pages, matching the `admin/actions.ts` convention):

Rooms:
- `createRoom(name, description, approvalMode, approvalThreshold)` — `requireUser()`, create room + owner membership in a transaction, `revalidatePath('/rooms')`.
- `updateRoom(roomId, {name, description, approvalMode, approvalThreshold})` — `requireRoomOwner`.
- `deleteRoom(roomId)` — `requireRoomOwner`, delete room (cascades everything). `revalidatePath('/rooms')`.

Membership / invites:
- `searchUsersForInvite(roomId, query)` — `requireRoomOwner`, `ILIKE` on name/email excluding current members.
- `inviteToRoom(roomId, userId)` — `requireRoomOwner`, upsert pending invite with fresh `expiresAt`.
- `acceptInvite(inviteId)` — `requireUser()`, verify `invite.invitedUserId === id`, check not expired, mark accepted + insert membership (transaction), `revalidatePath`.
- `declineInvite(inviteId)` — `requireUser()`, verify ownership, mark declined, `revalidatePath`.
- `removeMember(roomId, userId)` — `requireRoomOwner`. One transaction: (a) delete the `roomMember` row; (b) **explicitly delete that user's `suggestionVote` rows for the room** — the `suggestionVote.userId` FK cascade only fires when a user *account* is deleted, not when membership ends, so approval rows must be removed here or they keep counting toward thresholds; (c) re-resolve the room's pending suggestions (N changed — see §5, §9), taking the same row locks (§9). `revalidatePath`.

Suggestions / approval:
- **(shared helper) `finalizeExpired(roomId)`** — bulk sweep: `UPDATE suggestion SET status='expired' WHERE roomId = ? AND status='pending' AND expires_at < now`. Run at the start of `suggestMovie`'s duplicate check and when the room page loads, so stale rows can't keep the partial pending index blocking a re-suggest. Cron-free.
- `suggestMovie(roomId, tmdbId)` — `requireRoomMember`; run `finalizeExpired`; check duplicate (pending/queue/history); fetch TMDB details; insert suggestion (`status='pending'`, `expiresAt = now + 7d`) + auto-approval for the suggester; run resolution check; `revalidatePath`.
- `approveSuggestion(roomId, suggestionId)` — `requireRoomMember`; upsert the member's `suggestionVote` row (no-op on double-approve); run resolution check. **There is no reject action.**

Queue / history:
- `markWatched(roomId, queueEntryId)` — `requireRoomMember`; **shared Room state**: one transaction deletes the queue entry and inserts a history row (`watchedById` = acting member, audit-only); every member sees the same result. Guard against double-mark races (see §9). `revalidatePath`.
- `reorderQueue(roomId, orderedIds)` — `requireRoomOwner`; rewrite positions; `revalidatePath`.
- `removeQueueEntry(roomId, entryId)` — `requireRoomOwner`; renumber; `revalidatePath`.
- `removeHistoryEntry(roomId, historyId)` — `requireRoomOwner`; `revalidatePath`.

**Reusable resolution logic** `src/lib/rooms/approval.ts`:
- `evaluateApproval(mode, threshold, approvals, memberCount)` — pure function, approval-only (no reject).
- `isExpired(expiresAt, now = Date.now())` — pure check for lazy expiry.
- `resolveSuggestionIfReady(room, suggestionId, approvals)` — reads current approvals + member count; if `expiresAt` has passed, marks the suggestion `expired`; else if the threshold is met, checks queue/history for duplicates then inserts a queue entry and marks the suggestion `approved`. Nothing is ever rejected.

---

## 9. Data integrity / concurrency

Places where races could corrupt state; all must be handled with DB constraints and/or transactions:

1. **Live member count / threshold race**: two members approving at once. A transaction alone is insufficient — under READ COMMITTED two concurrent transactions can both read the same approval tally, both decide, and both insert. The approval upsert + resolution check + queue insert must run in a **single transaction** (`db.transaction`) **and** take a **`FOR NO KEY UPDATE` row lock on the suggestion** at the start (`.for('no key update')` in Drizzle, confirmed available) — this serializes concurrent same-suggestion approvals; the loser re-reads the tally after the winner commits. `FOR NO KEY UPDATE` is the correct strength since only non-key columns (`status`) are mutated. `removeMember` takes the same locks on the suggestions it re-resolves (§8). Use the existing single `db` instance — do not create another pool.
2. **Unique approvals**: `suggestionVote` unique `(suggestionId, userId)` prevents a member approving twice (upsert on conflict — a double-approve is a no-op).
3. **No duplicate pending suggestions**: **partial unique index** on `suggestion(roomId, tmdbId) WHERE status = 'pending'`. This is what makes the suggest race safe. Drizzle supports `index().on(...).where(...)` — use that so it lands in generated SQL. Do **not** hand-edit `drizzle/`.
4. **No duplicate queue entries**: unique `queueEntry(roomId, tmdbId)`. The approval transaction checks so an already-queued or already-watched movie resolves as a duplicate.
5. **No duplicate history**: unique `watchHistory(roomId, tmdbId)`.
6. **Contiguous, unique queue positions**: unique index on `queueEntry(roomId, position)`. Renumbering happens inside the same transaction that adds/removes an entry.
7. **Member leaving — two distinct paths**:
   - **User account deleted** (e.g. admin `deleteUser`): `suggestionVote.userId → user.id` and `roomMember.userId → user.id` with `onDelete: cascade` handle cleanup automatically.
   - **Removed from membership** (`removeMember` does **not** delete the user, so the FK cascade never fires): the action must **explicitly delete** that user's `suggestionVote` rows for the room, then re-resolve the room's pending suggestions — N changed, so thresholds re-evaluate (see §5). Because their approvals are gone, pending suggestions see the approval tally drop exactly as if they'd never approved.
8. **Invite upsert**: unique `(roomId, invitedUserId)`; re-invite = `onConflictDoUpdate set expiresAt`.
9. **Expired invites + suggestions**: lazy treatment — treat `created`-based `expiresAt < now` as expired on read; refuse acceptance of an expired invite; a pending suggestion past `expiresAt` resolves to `expired` on the next read/resolution attempt. To keep the partial pending index accurate (so an un-finalized expired row doesn't block a re-suggest of that movie), run the `finalizeExpired` bulk sweep (see §8) before the pending-list query and before `suggestMovie`'s duplicate check. `# ponytail: lazy expiry — add a scheduled cleanup job if these tables grow large`.
10. **Shared mark-watched race**: if two members click "Mark as Watched" on the same queue entry simultaneously, the transaction must be idempotent — `DELETE queueEntry WHERE id = ? RETURNING ...`, then `INSERT watchHistory ... ON CONFLICT (roomId, tmdbId) DO NOTHING`. The unique `watchHistory(roomId, tmdbId)` constraint means the second racer inserts nothing; if the queue entry is already gone, the delete is a no-op. Result: exactly one history row, queue entry removed once, no error surfaced to the second member.

**Migration workflow:** new `src/lib/rooms/schema.ts` → `pnpm db:generate` → inspect SQL in `drizzle/` (ensure partial index + all FKs/uniques present) → `pnpm db:migrate`.

---

## 10. Implementation order (phases)

Each phase is independently codable and testable, no rework.

### Phase 1 — Database schema + migration
- **Goal:** room/membership/invite/suggestion/approval/queue/history tables exist with all constraints.
- **Files:** add `src/lib/rooms/schema.ts`; spread into `src/lib/db/client.ts`; `pnpm db:generate` + inspect + `pnpm db:migrate`; add `tests/helpers/seed.ts` additions if useful.
- **No UI yet.** Verify with the DB client unit test pattern.

### Phase 2 — Approval engine (+ tests)
- **Goal:** pure, unit-tested approval logic (`majority`/`unanimous`/`percentage`) — approval-only, plus the lazy-expiry `isExpired` check.
- **Files:** `src/lib/rooms/approval.ts`, `src/lib/rooms/approval.test.ts`.
- Fully independent of UI; highest-risk logic locked in early.

### Phase 3 — Rooms CRUD + membership (create/list/view/create form, owner checks)
- **Goal:** create a room (name required, description optional), list your rooms, view a room shell, own it. Server actions `createRoom`/`updateRoom`/`deleteRoom` + `requireRoomMember`/`requireRoomOwner` helpers.
- **Files:** `src/lib/rooms/auth.ts`, `src/app/rooms/actions.ts`, `src/app/rooms/page.tsx`, `src/app/rooms/new/page.tsx`, `src/app/rooms/[roomId]/page.tsx`, room components. Update `src/proxy.ts` (`/rooms/:path*` in `protectedRoutes` + matcher). Navbar link to `/rooms`.

### Phase 4 — Suggestions + approval
- **Goal:** member suggests a TMDB movie → pending (with `expiresAt`) → other members approve → threshold resolution auto-places into the queue, or the suggestion lazily expires (`finalizeExpired` sweep). Suggest via search modal (reuse `/api/search`).
- **Files:** add to `actions.ts` (`suggestMovie`, `approveSuggestion`, `finalizeExpired`), `queueEntry` insert logic, `suggestion-list.tsx`, `suggest-movie-dialog.tsx`, room page suggestions tab.

### Phase 5 — Queue + history (ordered queue, reorder, watch-next)
- **Goal:** approved movies form an ordered queue; owner reorders; **any member** marking a movie watched removes it from the shared queue and adds it to the shared history for the entire Room (idempotent under concurrent marks).
- **Files:** `actions.ts` (`markWatched`, `reorderQueue`, `removeQueueEntry`, `removeHistoryEntry`), `queue-list.tsx`, room page tabs.
- Also handles the duplicate check for movies already queued/watched.

### Phase 6 — Invites (name/email search, internal, account-page surface, expiry)
- **Goal:** owner invites by name/email; invitee sees/accepts/declines on `/account`; expires after N days.
- **Files:** actions (`searchUsersForInvite`, `inviteToRoom`, `acceptInvite`, `declineInvite`, `removeMember`), `invite-members.tsx`, `member-list.tsx`, `room-invites.tsx`, extend `/account` page, settings section for owner.

### Phase 7 — Approval-rule configuration, polish, e2e
- **Goal:** per-room configurable approval mode (settings UI), edge-case hardening, Playwright e2e coverage for the happy paths.
- **Files:** `room-settings.tsx` (approval mode selector), any remaining polish, `tests/e2e/rooms.spec.ts` + seed helpers.

---

## Settled defaults (v1)

All previously-open decisions are resolved with these defaults. Revisit any of them deliberately; do not silently change them.

1. **`N` = current member count; the suggester's auto-approval counts** — a lone-member room approves its own suggestion instantly.
2. **Approval is irreversible once in queue** — a member leaving after approval doesn't eject the movie.
3. **Movies persist by `tmdbId` + denormalized title/poster/year**; details are fetched live from TMDB.
4. **A watched or expired suggestion frees `(roomId, tmdbId)`** — re-suggestion is allowed.
5. **Queue reorder / entry removal: owner-only** in v1.
6. **Suggestion and invite expiry: 7 days**, timer starts at creation, never reset by activity.
7. **No withdraw / un-approve in v1** — a suggestion either reaches the threshold (approved) or expires.