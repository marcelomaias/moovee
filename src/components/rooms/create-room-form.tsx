"use client";

import { useActionState } from "react";
import { createRoom } from "@/app/rooms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const textareaClass =
  "flex min-h-24 w-full rounded-lg border border-input bg-transparent px-4 py-3 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function CreateRoomForm() {
  const [state, formAction, pending] = useActionState(createRoom, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="e.g. Friday Movie Night"
          className="h-11 text-base"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className={textareaClass}
          placeholder="Optional — what is this room for?"
        />
      </div>
      {state?.error ? (
        <p className="text-base text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Creating..." : "Create Room"}
      </Button>
    </form>
  );
}