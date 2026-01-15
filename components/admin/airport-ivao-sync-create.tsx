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
  locale: string;
  action: (prevState: SyncState, formData: FormData) => Promise<SyncState>;
};

export function AirportIvaoSyncCreate({ locale, action }: Props) {
  const [state, formAction] = useActionState(action, { success: false });

  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
      <div>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Sync airport from IVAO</p>
        <p className="text-xs text-[color:var(--text-muted)]">Create or update an airport by ICAO.</p>
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          name="icao"
          placeholder="LPPT"
          className="w-28 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-sm text-[color:var(--text-primary)]"
        />
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" size="sm" variant="secondary">
          Sync
        </Button>
      </form>
      {state.error ? <p className="text-xs text-[color:var(--danger)]">{state.error}</p> : null}
      {state.success && state.changes?.length ? (
        <div className="space-y-1 text-xs text-[color:var(--text-muted)]">
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
