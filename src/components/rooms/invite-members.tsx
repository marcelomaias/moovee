"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  inviteToRoom,
  searchUsersForInvite,
} from "@/app/rooms/actions";

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export function InviteMembers({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setResults(await searchUsersForInvite(roomId, q));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, roomId]);

  const invite = (userId: string) => {
    if (invitingId !== null) return;
    setError(null);
    setInvitingId(userId);
    startTransition(async () => {
      try {
        const result = await inviteToRoom(roomId, userId);
        if (result?.error) {
          setError(result.error);
        } else {
          setQuery("");
          setResults([]);
          router.refresh();
        }
      } catch {
        setError("Couldn't send the invitation. Please retry.");
      } finally {
        setInvitingId(null);
      }
    });
  };

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name or email…"
          className="pl-9"
        />
      </div>
      <div className="mt-3 space-y-2">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {searching && <p className="text-sm text-muted-foreground">Searching…</p>}
        {!searching && query.trim() !== "" && results.length === 0 && (
          <p className="text-sm text-muted-foreground">No users found.</p>
        )}
        {results.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
            <Button
              size="sm"
              disabled={invitingId === u.id}
              onClick={() => invite(u.id)}
            >
              {invitingId === u.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="size-4" /> Invite
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}