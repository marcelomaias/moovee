import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUser, updateUserRole } from "@/app/admin/actions";
import { db } from "@/lib/db/client";
import { user } from "@/lib/auth/schema";
import { eq } from "drizzle-orm";
import { createUser, getSessionHeaders, makeTestUser } from "@test/helpers/seed";

const { redirects, sessionHeadersMock, revalidated } = vi.hoisted(() => ({
  redirects: [] as string[],
  sessionHeadersMock: { value: new Headers() },
  revalidated: [] as string[],
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

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidated.push(path);
  },
}));

describe("admin server actions", () => {
  beforeEach(() => {
    redirects.length = 0;
    revalidated.length = 0;
  });

  describe("deleteUser", () => {
    it("rejects unauthenticated requests", async () => {
      sessionHeadersMock.value = new Headers();
      await expect(deleteUser("any")).rejects.toThrow("NEXT_REDIRECT:/sign-in");
      expect(redirects).toEqual(["/sign-in"]);
    });

    it("rejects non-admin users", async () => {
      const regular = await createUser(makeTestUser("del-regular", "user"));
      sessionHeadersMock.value = await getSessionHeaders(regular.email, regular.password);
      await expect(deleteUser("any")).rejects.toThrow("NEXT_REDIRECT:/");
    });

    it("deletes the user when called by an admin", async () => {
      const admin = await createUser(makeTestUser("del-admin", "admin"));
      const victim = await createUser(makeTestUser("del-victim", "user"));
      sessionHeadersMock.value = await getSessionHeaders(admin.email, admin.password);

      const result = await deleteUser(victim.id);

      expect(result).toEqual({ success: true });
      const remaining = await db.select().from(user).where(eq(user.id, victim.id));
      expect(remaining).toHaveLength(0);
      expect(revalidated).toContain("/admin");
    });
  });

  describe("updateUserRole", () => {
    it("rejects unauthenticated requests", async () => {
      sessionHeadersMock.value = new Headers();
      await expect(updateUserRole("any", "admin")).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    });

    it("rejects non-admin users", async () => {
      const regular = await createUser(makeTestUser("role-regular", "user"));
      sessionHeadersMock.value = await getSessionHeaders(regular.email, regular.password);
      await expect(updateUserRole("any", "admin")).rejects.toThrow("NEXT_REDIRECT:/");
    });

    it("updates the persisted role when called by an admin", async () => {
      const admin = await createUser(makeTestUser("role-admin", "admin"));
      const target = await createUser(makeTestUser("role-target", "user"));
      sessionHeadersMock.value = await getSessionHeaders(admin.email, admin.password);

      const result = await updateUserRole(target.id, "admin");

      expect(result).toEqual({ success: true });
      const [row] = await db.select().from(user).where(eq(user.id, target.id));
      expect(row?.role).toBe("admin");
      expect(revalidated).toContain("/admin");
    });
  });
});