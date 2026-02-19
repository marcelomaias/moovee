"use client";

import { Film } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "MAIN" },
    { href: "/favorites", label: "FAVORITES" },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: "rgba(14,17,23,0.97)",
        borderColor: "var(--border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Film />
          <span className="font-condensed tracking-widest text-xl text-white">
            MOOVEE
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-8">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-xs font-semibold tracking-widest transition-colors pb-1 ${
                  active
                    ? "nav-active text-white"
                    : "text-[var(--text-muted)] hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
