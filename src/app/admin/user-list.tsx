"use client";

import { useTransition } from "react";
import { deleteUser, updateUserRole } from "./actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trash2, ShieldAlert, User, Loader2 } from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

export function UserList({ initialUsers, currentAdminId }: { initialUsers: UserItem[], currentAdminId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, name: string) => {
    if (id === currentAdminId) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (confirm(`Are you sure you want to completely delete user "${name}"?`)) {
      startTransition(async () => {
        await deleteUser(id);
      });
    }
  };

  const handleRoleChange = (id: string, targetRole: string) => {
    if (id === currentAdminId) {
      alert("You cannot change your own admin role access from this dashboard.");
      return;
    }
    startTransition(async () => {
      await updateUserRole(id, targetRole);
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
        <h3 className="font-semibold text-lg">System Registrations</h3>
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {initialUsers.map((item) => (
          <li key={item.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm sm:text-base">{item.name}</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.role === 'admin' 
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900' 
                    : 'bg-neutral-50 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
                }`}>
                  {item.role === 'admin' ? <ShieldAlert className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {item.role ?? "user"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">{item.email}</p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isPending || item.id === currentAdminId}
                  className="text-xs font-medium px-3 py-1.5 border border-neutral-200 rounded-md hover:bg-neutral-50 active:scale-95 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800 transition-all capitalize"
                >
                  {item.role ?? "user"}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[110px]">
                  <DropdownMenuRadioGroup
                    value={item.role ?? "user"}
                    onValueChange={(v) => handleRoleChange(item.id, v)}
                  >
                    <DropdownMenuRadioItem value="user" className="text-xs">User</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="admin" className="text-xs">Admin</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => handleDelete(item.id, item.name)}
                disabled={isPending || item.id === currentAdminId}
                className="p-1.5 text-neutral-400 hover:text-red-600 border border-transparent hover:border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md disabled:opacity-30 transition-all"
                title="Delete User Account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
