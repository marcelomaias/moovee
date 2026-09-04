import { requireUser } from "@/lib/auth/permissions";
import { AvatarUpload } from "@/components/account/avatar-upload";
import { ChangeEmailForm } from "@/components/account/change-email-form";
import { ChangeNameForm } from "@/components/account/change-name-form";
import { ChangePasswordForm } from "@/components/account/change-password-form";
import { NavBar } from "@/components/navbar";

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

          <div className="mt-6 flex items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-muted-foreground">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <AvatarUpload />
            </div>

            <div>
              <p className="font-medium text-4xl">{user.name}</p>
              <p className="text-xl text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Name</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current name: {user.name}
          </p>

          <div className="mt-4">
            <ChangeNameForm />
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current email: {user.email}
          </p>

          <div className="mt-4">
            <ChangeEmailForm />
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Security</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your password and account security.
          </p>

          <div className="mt-6">
            <ChangePasswordForm />
          </div>
        </section>
      </div>
    </main>
  );
}
