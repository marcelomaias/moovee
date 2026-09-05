import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { user } from "@/lib/auth/schema";
import { eq } from "drizzle-orm";

/**
 * Shared test fixtures. The callers (vitest.config.ts and playwright.config.ts)
 * load `.env.test` before any of these modules are imported, so the `db` pool
 * below always points at the dedicated test database.
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
}

/** Fixed users used by the Playwright end-to-end suite (global-setup seeds them). */
export const REGULAR_TEST_USER: TestUser = {
  name: "Regular Test User",
  email: "user@test.local",
  password: "TestPassw0rd!",
  role: "user",
};

export const ADMIN_TEST_USER: TestUser = {
  name: "Admin Test User",
  email: "admin@test.local",
  password: "AdminPassw0rd!",
  role: "admin",
};

/** A uniquely-identified user so parallel Vitest files never collide on email. */
export function makeTestUser(prefix: string, role: TestUser["role"]): TestUser {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Test ${role} ${prefix}`,
    email: `${prefix}-${unique}@test.local`,
    password: "TestPassw0rd!",
    role,
  };
}

/**
 * Creates the user through the real Better Auth sign-up flow (handles password
 * hashing and the user + account records) and pins the persisted role. Idempotent.
 */
export async function createUser(u: TestUser): Promise<TestUser & { id: string }> {
  const existing = await db.select().from(user).where(eq(user.email, u.email)).limit(1);
  let id = existing[0]?.id;

  if (!id) {
    const res = await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.name },
    });
    id = res.user?.id;
    if (!id) {
      throw new Error(`Failed to create test user ${u.email}`);
    }
  }

  await db.update(user).set({ role: u.role }).where(eq(user.id, id));
  return { ...u, id };
}

/** Seeds the fixed users used by the Playwright suite. Returns their ids. */
export async function seedTestUsers(): Promise<{
  regular: TestUser & { id: string };
  admin: TestUser & { id: string };
}> {
  return {
    regular: await createUser(REGULAR_TEST_USER),
    admin: await createUser(ADMIN_TEST_USER),
  };
}

/**
 * Signs in through the real Better Auth HTTP handler (the same path the
 * app's catch-all route uses) and returns Headers carrying the real session
 * cookie, ready for `auth.api.getSession({ headers })` and the
 * `requireUser()` / `requireAdmin()` guards.
 */
export async function getSessionHeaders(email: string, password: string): Promise<Headers> {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3100";
  const endpoint = new URL("/api/auth/sign-in/email", baseUrl);

  const res = await auth.handler(
    new Request(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify({ email, password }),
    }),
  );

  const headers = new Headers();
  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [res.headers.get("set-cookie")].filter((c): c is string => Boolean(c));

  for (const c of setCookies) {
    headers.append("cookie", c.split(";")[0]);
  }

  if (!headers.has("cookie")) {
    throw new Error(`Sign-in for ${email} produced no session cookie (${res.status})`);
  }
  return headers;
}