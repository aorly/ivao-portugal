"use client";

import { useState } from "react";

type Tab = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type Props = {
  tabs: Tab[];
  defaultTab?: string;
};

export function AirportTabs({ tabs, defaultTab }: Props) {
  const fallback = tabs[0]?.id ?? "";
  const [active, setActive] = useState(defaultTab || fallback);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              active === tab.id
                ? "bg-[color:var(--primary)]/20 text-[color:var(--primary)]"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((tab) => tab.id === active)?.content ?? null}</div>
    </div>
  );
}
