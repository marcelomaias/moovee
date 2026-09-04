"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/permissions";
import { db } from "@/lib/db/client";
import { user } from "@/lib/auth/schema";
import { eq } from "drizzle-orm";

export async function deleteUser(userId: string) {
  // Enforce server-side security checks
  await requireAdmin();

  // Perform database deletion
  await db.delete(user).where(eq(user.id, userId));

  // Note: Direct DB deletion bypasses better-auth hooks.
  // If active user sessions need immediate invalidation later, wire better-auth hooks here.

  revalidatePath("/admin");
  return { success: true };
}

export async function updateUserRole(userId: string, targetRole: string) {
  await requireAdmin();

  // Perform database update
  await db.update(user).set({ role: targetRole }).where(eq(user.id, userId));

  revalidatePath("/admin");
  return { success: true };
}
