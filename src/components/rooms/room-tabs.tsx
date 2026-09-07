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
      <div className="flex gap-2 border-b" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn(
              "px-5 py-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground",
              t.key === active &&
                "border-b-2 border-foreground text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{activeTab.content}</div>
    </div>
  );
}