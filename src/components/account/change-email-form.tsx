"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ChangeEmailForm() {
  const router = useRouter();
  const { data: session, refetch } = authClient.useSession();
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentEmail = session?.user?.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      setError("New email is the same as your current email");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.changeEmail({
        newEmail,
        callbackURL: "/account",
      });

      if (error) {
        setError(error.message || "Failed to change email");
      } else {
        setNewEmail("");
        setSuccess("Email updated successfully");
        await refetch();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid max-w-sm gap-2">
        <Label htmlFor="new-email">New email</Label>
        <Input
          id="new-email"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          disabled={loading}
          placeholder="you@example.com"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-500">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-500">
          {success}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Updating..." : "Change email"}
      </Button>
    </form>
  );
}
