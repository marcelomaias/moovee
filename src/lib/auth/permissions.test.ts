import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAdmin, requireUser } from "@/lib/auth/permissions";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

const { redirects, sessionHeadersMock } = vi.hoisted(() => ({
  redirects: [] as string[],
  sessionHeadersMock: { value: new Headers() },
}));

vi.mock("next/headers", () => ({
  headers: async () => sessionHeadersMock.value,
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirects.push(path);
    const err = new Error(`NEXT_REDIRECT:${path}`) as Error & { digest?: string };
    err.digest = `NEXT_REDIRECT:${path}`;
    throw err;
  },
}));

describe("requireUser", () => {
  const testUser = makeTestUser("req-user", "user");

  beforeEach(() => {
    redirects.length = 0;
  });

  it("redirects to /sign-in when unauthenticated", async () => {
    sessionHeadersMock.value = new Headers();
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(redirects).toEqual(["/sign-in"]);
  });

  it("returns the session for an authenticated user", async () => {
    await createUser(testUser);
    sessionHeadersMock.value = await getSessionHeaders(testUser.email, testUser.password);
    const session = await requireUser();
    expect(session.user.email).toBe(testUser.email);
  });
});

describe("requireAdmin", () => {
  const regular = makeTestUser("req-regular", "user");
  const admin = makeTestUser("req-admin", "admin");

  beforeEach(() => {
    redirects.length = 0;
  });

  it("redirects a regular user to /", async () => {
    await createUser(regular);
    sessionHeadersMock.value = await getSessionHeaders(regular.email, regular.password);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirects).toEqual(["/"]);
  });

  it("returns the session for an admin user", async () => {
    await createUser(admin);
    sessionHeadersMock.value = await getSessionHeaders(admin.email, admin.password);
    const session = await requireAdmin();
    expect(session.user.role).toBe("admin");
  });
});