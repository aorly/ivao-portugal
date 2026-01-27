"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type MonthItem = {
  key: string;
  label: string;
  isCurrent?: boolean;
};

type StatItem = {
  monthKey: string;
  sessionsTotalCount: number;
};

type Props = {
  months: MonthItem[];
  stats: StatItem[];
  locale: string;
  canSync: boolean;
  action: (formData: FormData) => Promise<void>;
  syncAllAction?: (formData: FormData) => Promise<void>;
};

export function ProfileMonthlySync({ months, stats, locale, canSync, action, syncAllAction }: Props) {
  const [open, setOpen] = useState(false);
  const statsMap = useMemo(() => new Map(stats.map((stat) => [stat.monthKey, stat])), [stats]);

  return (
    <>
      {canSync ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Monthly sync
        </Button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Monthly sync</p>
                <p className="text-xs text-[color:var(--text-muted)]">Last 12 months</p>
              </div>
              <div className="flex items-center gap-2">
                {syncAllAction ? (
                  <form action={syncAllAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <Button size="sm" variant="secondary">
                      Sync all
                    </Button>
                  </form>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {months.map((month) => {
                const stat = statsMap.get(month.key);
                const synced = Boolean(stat);
                return (
                  <div
                    key={month.key}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      synced
                        ? "border-[color:var(--success)] bg-[color:var(--success)]/15"
                        : "border-[color:var(--danger)] bg-[color:var(--danger)]/10"
                    }`}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                        {month.label}
                      </p>
                      <p className="text-sm text-[color:var(--text-primary)]">
                        {synced ? `${stat?.sessionsTotalCount ?? 0} sessions` : "Not synced"}
                      </p>
                      {month.isCurrent ? (
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                          Current month
                        </p>
                      ) : null}
                    </div>
                    <form action={action}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="monthKey" value={month.key} />
                      <Button
                        size="sm"
                        variant="secondary"
                        className={
                          synced
                            ? "border-[color:var(--success)] text-[color:var(--success)] hover:border-[color:var(--success)]"
                            : ""
                        }
                      >
                        {synced ? "Resync" : "Sync"}
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
