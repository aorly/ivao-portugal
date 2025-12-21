"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

type Item = {
  id: string;
  code: string;
  extra?: string | null;
  fir?: string | null;
};

type Props = {
  title: string;
  items: Item[];
};

export function NavAidList({ title, items }: Props) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const needle = search.toLowerCase();
    return items.filter(
      (i) =>
        i.code.toLowerCase().includes(needle) ||
        (i.extra ?? "").toLowerCase().includes(needle) ||
        (i.fir ?? "").toLowerCase().includes(needle),
    );
  }, [items, search]);

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          {title} ({items.length})
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="ml-auto w-32 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">No entries.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">No matches.</p>
      ) : (
        <div className="flex flex-wrap gap-1 text-xs text-[color:var(--text-muted)]">
          {filtered.map((i) => (
            <span
              key={i.id}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-[color:var(--text-primary)]"
            >
              {i.code}
              {i.extra ? ` ${i.extra}` : ""} · {i.fir ?? "—"}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
