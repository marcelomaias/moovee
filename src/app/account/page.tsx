import { requireUser } from "@/lib/auth/permissions";

export default async function AccountPage() {
  const session = await requireUser();
  const { user } = session;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your profile and account settings.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        <section className="rounded-lg border p-6">
          <div>
            <h2 className="text-xl font-semibold">Profile</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your personal information.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={user.name}
                className="rounded-md border bg-background px-3 py-2"
                disabled
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                className="rounded-md border bg-background px-3 py-2"
                disabled
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Security</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your password and account security.
          </p>

          <button
            type="button"
            disabled
            className="mt-6 rounded-md border px-4 py-2 text-sm font-medium opacity-50"
          >
            Change password
          </button>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account session.
          </p>

          <button
            type="button"
            disabled
            className="mt-6 rounded-md border px-4 py-2 text-sm font-medium opacity-50"
          >
            Sign out
          </button>
        </section>
      </div>
    </main>
  );
}
