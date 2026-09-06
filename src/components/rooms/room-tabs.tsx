"use client";

import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

export function RoomTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div className="flex gap-1 border-b" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              t.key === active &&
                "border-b-2 border-foreground text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeTab.content}</div>
    </div>
  );
}