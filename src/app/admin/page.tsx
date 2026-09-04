import { requireAdmin } from "@/lib/auth/permissions";
import { db } from "@/lib/db/client";
import { user } from "@/lib/auth/schema";
import { UserList } from "./user-list";
import { Users, DoorOpen, Film } from "lucide-react";

export default async function AdminPage() {
  const session = await requireAdmin();

  // Query actual system users via Drizzle
  const allUsers = await db.select({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }).from(user);

  return (
    <main className="mx-auto max-w-7xl p-8 space-y-12">
      {/* Welcome details */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, <span className="font-medium text-foreground">{session.user.name}</span>.
        </p>
      </div>

      {/* Grid Anchors */}
      <section className="grid gap-4 md:grid-cols-3">
        <a 
          href="#users-directory" 
          className="group rounded-xl border p-6 bg-card hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-all hover:scale-[1.01] hover:shadow-sm"
        >
          <div className="flex justify-between items-start">
            <h2 className="font-semibold text-neutral-700 dark:text-neutral-300">Users</h2>
            <Users className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">{allUsers.length}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-indigo-600 transition-colors font-medium">
            Jump to directory →
          </p>
        </a>

        <div className="rounded-xl border p-6 bg-card opacity-60">
          <div className="flex justify-between items-start">
            <h2 className="font-semibold text-neutral-700 dark:text-neutral-300">Rooms</h2>
            <DoorOpen className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">—</p>
          <p className="mt-1 text-xs text-muted-foreground">Management coming soon</p>
        </div>

        <div className="rounded-xl border p-6 bg-card opacity-60">
          <div className="flex justify-between items-start">
            <h2 className="font-semibold text-neutral-700 dark:text-neutral-300">Movies</h2>
            <Film className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight">—</p>
          <p className="mt-1 text-xs text-muted-foreground">Management coming soon</p>
        </div>
      </section>

      {/* Main interactive section */}
      <section id="users-directory" className="pt-6 border-t border-neutral-100 dark:border-neutral-800 scroll-mt-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">User Management</h2>
          <p className="text-sm text-muted-foreground">Review registration logs, update system permissions, or clear accounts.</p>
        </div>
        
        <UserList initialUsers={allUsers} currentAdminId={session.user.id} />
      </section>
    </main>
  );
}
