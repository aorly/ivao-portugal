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
  airports: { id: string; icao: string }[];
};

export function AirportIvaoSyncAll({ airports }: Props) {
  const [state, setState] = useState<SyncState>({ success: false });
  const [pending, setPending] = useState(false);
  const [current, setCurrent] = useState<{ icao: string; index: number }>({ icao: "", index: 0 });

  const total = airports.length;
  const progress = total > 0 ? Math.round((current.index / total) * 100) : 0;

  const handleSync = async () => {
    if (pending || total === 0) return;
    setPending(true);
    setState({ success: false, updated: 0, failed: 0, details: [] });
    setCurrent({ icao: "", index: 0 });

    const details: string[] = [];
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < airports.length; i += 1) {
      const airport = airports[i];
      setCurrent({ icao: airport.icao, index: i + 1 });
      try {
        const res = await fetch("/api/admin/airports/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: airport.id }),
        });
        const data = (await res.json()) as { changes?: string[]; error?: string };
        if (!res.ok) {
          failed += 1;
          details.push(`${airport.icao}: ${data?.error || "Sync failed"}`);
          continue;
        }
        const changes = data?.changes?.length ? data.changes.join(", ") : "No changes detected.";
        if (!changes.toLowerCase().includes("no changes")) updated += 1;
        details.push(`${airport.icao}: ${changes}`);
      } catch (error) {
        failed += 1;
        details.push(`${airport.icao}: ${error instanceof Error ? error.message : "Sync failed"}`);
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
    <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Sync all airports</p>
          <p className="text-xs text-[color:var(--text-muted)]">Updates all existing airports from IVAO.</p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={handleSync} disabled={pending || total === 0}>
          {pending ? "Syncing..." : "Sync all"}
        </Button>
      </div>
      {pending ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[color:var(--text-primary)]">
            Syncing {current.icao || "airports"} ({current.index}/{total})
          </p>
          <p className="text-[11px] text-[color:var(--text-muted)]">
            Loading airport details, runways, and ATC positions.
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
            <div className="h-full bg-[color:var(--primary)]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      {state.error ? <p className="text-xs text-[color:var(--danger)]">{state.error}</p> : null}
      {state.success ? (
        <div className="space-y-1 text-xs text-[color:var(--text-muted)]">
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
