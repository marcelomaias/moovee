import { requireAdmin } from "@/lib/auth/permissions";

export default async function AdminPage() {
  const session = await requireAdmin();

  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <p className="mt-2 text-muted-foreground">
        Welcome, {session.user.name}.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">Users</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            User management will go here.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">Rooms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Room management will go here.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="font-semibold">Movies</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Movie management will go here.
          </p>
        </div>
      </div>
    </main>
  );
}
