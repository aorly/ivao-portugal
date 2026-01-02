"use client";

import { useDocsPhaseTracking } from "@/components/public/use-docs-phase-tracking";

type PhaseItem = {
  id: string;
  title: string;
};

type Props = {
  items: PhaseItem[];
};

export function DocsPhaseNav({ items }: Props) {
  const { active, progress, validItems } = useDocsPhaseTracking(items, {
    storageKey: "docs:last-phase",
  });

  if (validItems.length === 0) return null;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <div
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/80 p-4"
          data-print-hide
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                You are here
              </p>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {validItems.find((item) => item.id === active)?.title ?? ""}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Progress
              </p>
              <div className="h-1 w-full rounded-full bg-[color:var(--border)]/60">
                <div
                  className="h-1 rounded-full bg-[color:var(--primary)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <nav className="space-y-2 text-sm">
              {validItems.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block rounded-lg px-2 py-1 text-sm transition ${
                    active === item.id
                      ? "bg-[color:var(--surface-2)] text-[color:var(--text-primary)]"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  }`}
                >
                  <span className="mr-2 text-xs font-semibold text-[color:var(--text-muted)]">
                    {index + 1}.
                  </span>
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
}
