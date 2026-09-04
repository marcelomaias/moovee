"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeSelector } from "@/components/themes/selector";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth/client";

export function NavBar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const user = session?.user;
  const initial = (
    user?.name?.charAt(0) ||
    user?.email?.charAt(0) ||
    "?"
  ).toUpperCase();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4">
      <nav className="flex items-center justify-between py-4">
        <Link href="/">
          <div className="flex items-center">
            <Image
              className="lg:h-7 lg:w-auto dark:hidden"
              src="/logo.svg"
              alt="Neon logo"
              width={88}
              height={24}
              priority
            />
            <Image
              className="hidden lg:h-7 lg:w-auto dark:block"
              src="/logo-dark.svg"
              alt="Neon logo"
              width={88}
              height={24}
              priority
            />
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeSelector />
          {isPending ? (
            <Button variant="outline" disabled>
              Loading...
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name || user.email}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {initial}
                      </span>
                    )}
                  </span>
                  <span className="hidden flex-col items-start leading-tight sm:flex">
                    <span className="text-sm font-medium">
                      {user.name || "Account"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || "Account"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">Account</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
