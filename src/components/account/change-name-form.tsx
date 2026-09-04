"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ChangeNameForm() {
  const router = useRouter();
  const { data: session, refetch } = authClient.useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }
    if (trimmed === session?.user?.name) {
      setError("Name is unchanged");
      return;
    }

    setLoading(true);
    try {
      const { error } = await authClient.updateUser({ name: trimmed });

      if (error) {
        setError(error.message || "Failed to update name");
      } else {
        setName(trimmed);
        setSuccess("Name updated successfully");
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
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
        {loading ? "Updating..." : "Update name"}
      </Button>
    </form>
  );
}
