import { describe, expect, it } from "vitest";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { account, session, user } from "@/lib/auth/schema";
import { count, eq } from "drizzle-orm";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

describe("auth integration", () => {
  it("registers a user and writes the expected records", async () => {
    const u = makeTestUser("signup", "user");
    const res = await auth.api.signUpEmail({
      body: { email: u.email, password: u.password, name: u.name },
    });

    expect(res.user?.email).toBe(u.email);

    const users = await db.select().from(user).where(eq(user.email, u.email));
    expect(users).toHaveLength(1);
    expect(users[0].role).toBe("user");

    const accounts = await db.select().from(account).where(eq(account.userId, users[0].id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0].providerId).toBe("credential");
  });

  it("creates a valid session on sign-in", async () => {
    const u = await createUser(makeTestUser("signin", "user"));
    const headers = await getSessionHeaders(u.email, u.password);

    const sessionData = await auth.api.getSession({ headers });
    expect(sessionData?.user.id).toBe(u.id);
  });

  it("invalidates the session on sign-out", async () => {
    const u = await createUser(makeTestUser("signout", "user"));
    const headers = await getSessionHeaders(u.email, u.password);

    // signUpEmail auto-creates a session, so count sessions before/after by
    // this user and expect exactly the signed-in one to be deleted.
    const countForUser = async () => {
      const [row] = await db.select({ count: count() }).from(session).where(eq(session.userId, u.id));
      return row?.count ?? 0;
    };
    const before = await countForUser();

    await auth.api.signOut({ headers });

    expect(await auth.api.getSession({ headers })).toBeNull();
    expect(await countForUser()).toBe(before - 1);
  });

  it("persists role changes from the database", async () => {
    const u = await createUser(makeTestUser("role", "user"));

    await db.update(user).set({ role: "admin" }).where(eq(user.id, u.id));

    const [row] = await db.select().from(user).where(eq(user.id, u.id));
    expect(row?.role).toBe("admin");
  });

  it("cascades deletes to sessions and accounts when a user is removed", async () => {
    const u = await createUser(makeTestUser("cascade", "user"));
    await getSessionHeaders(u.email, u.password);

    await db.delete(user).where(eq(user.id, u.id));

    const [sessions] = await db.select({ count: count() }).from(session).where(eq(session.userId, u.id));
    const [accounts] = await db.select({ count: count() }).from(account).where(eq(account.userId, u.id));
    expect(sessions?.count).toBe(0);
    expect(accounts?.count).toBe(0);
  });

  it("changes the password with a valid session", async () => {
    const u = await createUser(makeTestUser("pwd", "user"));
    const headers = await getSessionHeaders(u.email, u.password);

    const newPassword = "NewPassw0rd!";
    const res = await auth.api.changePassword({
      body: {
        currentPassword: u.password,
        newPassword,
        revokeOtherSessions: true,
      },
      headers,
    });

    const fresh = await getSessionHeaders(u.email, newPassword);
    expect((await auth.api.getSession({ headers: fresh }))?.user.id).toBe(u.id);
  });
});