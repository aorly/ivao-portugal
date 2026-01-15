"use client";

import { useMemo, useState } from "react";
import { useDocsPhaseTracking } from "@/components/public/use-docs-phase-tracking";
import { PracticeModeToggle } from "@/components/public/practice-mode";

type PhaseItem = {
  id: string;
  title: string;
};

type SearchItem = {
  id: string;
  title?: string | null;
  text?: string | null;
};

type Props = {
  items: PhaseItem[];
  searchIndex: SearchItem[];
  storageKey: string;
};

const makeSnippet = (text: string | null | undefined, query: string) => {
  const safeText = text ?? "";
  const normalized = safeText.toLowerCase();
  const idx = normalized.indexOf(query.toLowerCase());
  if (idx === -1) return safeText.slice(0, 140);
  const start = Math.max(0, idx - 60);
  const end = Math.min(safeText.length, idx + 60);
  return `${start > 0 ? "..." : ""}${safeText.slice(start, end)}${end < safeText.length ? "..." : ""}`;
};

export function DocsTools({ items, searchIndex, storageKey }: Props) {
  const { active, validItems } = useDocsPhaseTracking(items, { storageKey });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const saved = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(storageKey);
  }, [storageKey]);

  const activeTitle = validItems.find((item) => item.id === active)?.title ?? "";

  const results = useMemo(() => {
    if (!query.trim()) return searchIndex;
    const q = query.toLowerCase();
    return searchIndex.filter((item) => {
      const title = item.title ?? "";
      const text = item.text ?? "";
      return title.toLowerCase().includes(q) || text.toLowerCase().includes(q);
    });
  }, [query, searchIndex]);

  return (
    <div className="space-y-4" data-print-hide>
      <div className="sticky top-20 z-20 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              You are here
            </p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{activeTitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              onClick={() => setOpen(true)}
            >
              Search
            </button>
            <PracticeModeToggle />
            <button
              type="button"
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              onClick={() => window.print()}
            >
              Print / PDF
            </button>
          </div>
        </div>
        {saved && saved !== active ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[color:var(--border)]/70 bg-[color:var(--surface)] px-3 py-2">
            <div>
              <p className="text-xs text-[color:var(--text-muted)]">Continue where you left off</p>
            </div>
            <a
              href={`#${saved}`}
              className="rounded-full bg-[color:var(--primary)] px-3 py-1 text-xs font-semibold text-white"
            >
              Resume
            </a>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-4 left-0 right-0 z-30 flex justify-center px-4 lg:hidden" data-print-hide>
        <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 px-4 py-2 shadow-[var(--shadow-soft)]">
          <span className="text-xs font-semibold text-[color:var(--text-muted)]">Progress</span>
          <button
            type="button"
            className="rounded-full bg-[color:var(--primary)] px-3 py-1 text-xs font-semibold text-white"
            onClick={() => setOpen(true)}
          >
            Phases
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 py-12">
          <div className="w-full max-w-2xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Search the guide</h3>
              <button
                type="button"
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type a phase or keyword"
              className="mt-3 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <div className="mt-4 max-h-[60vh] space-y-3 overflow-auto">
              {results.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No results.</p>
              ) : (
                results.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 hover:border-[color:var(--primary)]"
                  >
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.title ?? ""}</p>
                    <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                      {query ? makeSnippet(item.text, query) : (item.text ?? "").slice(0, 140)}
                    </p>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
