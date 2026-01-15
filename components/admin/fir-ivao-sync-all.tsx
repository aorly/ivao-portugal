"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SyncState = {
  success?: boolean;
  error?: string;
  updated?: number;
  failed?: number;
  details?: string[];
};

type Props = {
  firs: { id: string; slug: string }[];
};

export function FirIvaoSyncAll({ firs }: Props) {
  const [state, setState] = useState<SyncState>({ success: false });
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<{ slug: string; index: number }>({ slug: "", index: 0 });

  const total = firs.length;
  const progress = total > 0 ? Math.round((current.index / total) * 100) : 0;

  const handleSync = async () => {
    if (pending || total === 0) return;
    setPending(true);
    setState({ success: false, updated: 0, failed: 0, details: [] });
    setCurrent({ slug: "", index: 0 });

    const details: string[] = [];
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < firs.length; i += 1) {
      const fir = firs[i];
      setCurrent({ slug: fir.slug, index: i + 1 });
      try {
        const res = await fetch("/api/admin/firs/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: fir.id }),
        });
        const data = (await res.json()) as { changes?: string[]; error?: string };
        if (!res.ok) throw new Error(data?.error || "Sync failed");
        const changes = data?.changes?.length ? data.changes.join(", ") : "No changes detected.";
        if (!changes.toLowerCase().includes("no changes")) updated += 1;
        details.push(`${fir.slug}: ${changes}`);
      } catch (error) {
        failed += 1;
        details.push(`${fir.slug}: ${error instanceof Error ? error.message : "Sync failed"}`);
      }
    }

    setState({
      success: true,
      updated,
      failed,
      details,
    });
    setPending(false);
  };

  return (
    <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[color:var(--text-primary)]">Sync all FIRs</p>
          <p className="text-[11px] text-[color:var(--text-muted)]">Updates boundaries and CTR positions.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={handleSync} disabled={pending || total === 0}>
          {pending ? "Syncing..." : "Sync all"}
        </Button>
      </div>
      {pending ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[color:var(--text-primary)]">
            Syncing {current.slug || "FIRs"} ({current.index}/{total})
          </p>
          <p className="text-[11px] text-[color:var(--text-muted)]">Loading boundaries and CTR positions.</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
            <div className="h-full bg-[color:var(--primary)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      {state.error ? <p className="text-[11px] text-[color:var(--danger)]">{state.error}</p> : null}
      {state.success ? (
        <div className="space-y-1 text-[11px] text-[color:var(--text-muted)]">
          <p>
            Updated: <span className="font-semibold text-[color:var(--text-primary)]">{state.updated ?? 0}</span> / Failed:{" "}
            <span className="font-semibold text-[color:var(--text-primary)]">{state.failed ?? 0}</span>
          </p>
          {state.details?.length ? (
            <ul className="list-disc pl-4">
              {state.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
