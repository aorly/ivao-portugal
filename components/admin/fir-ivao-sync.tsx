"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";

type SyncState = {
  success?: boolean;
  error?: string;
  changes?: string[];
  syncedAt?: string;
};

type Props = {
  firId: string;
  locale: string;
  action: (prevState: SyncState, formData: FormData) => Promise<SyncState>;
  lastUpdated?: string | null;
};

export function FirIvaoSync({ firId, locale, action, lastUpdated }: Props) {
  const [state, formAction] = useActionState(action, { success: false });

  const lastUpdatedLabel = (() => {
    const value = state.syncedAt ?? lastUpdated ?? null;
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  })();

  return (
    <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[color:var(--text-primary)]">IVAO Sync</p>
          <p className="text-[11px] text-[color:var(--text-muted)]">Last updated: {lastUpdatedLabel}</p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="firId" value={firId} />
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" size="sm" variant="secondary">
            Sync from IVAO
          </Button>
        </form>
      </div>
      {state.error ? <p className="text-[11px] text-[color:var(--danger)]">{state.error}</p> : null}
      {state.success && state.changes?.length ? (
        <div className="space-y-1 text-[11px] text-[color:var(--text-muted)]">
          <p className="font-semibold text-[color:var(--text-primary)]">Changes</p>
          <ul className="list-disc pl-4">
            {state.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
