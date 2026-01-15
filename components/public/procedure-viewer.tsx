"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";

const ProcedureMap = dynamic(() => import("@/components/map/procedure-map").then((m) => m.ProcedureMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
});

type Waypoint = {
  lat: number;
  lon: number;
  altitudeRestriction?: string | null;
  speedRestriction?: string | null;
  name?: string | null;
};
type Procedure = { id: string; name: string; runway: string; type: "SID" | "STAR"; waypoints: Waypoint[] };

export function ProcedureViewer({ procedures }: { procedures: Procedure[] }) {
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined);
  const [filter, setFilter] = useState<"ALL" | "SID" | "STAR" | undefined>(undefined);

  const storageKey = useMemo(() => {
    const ids = procedures.map((p) => p.id).sort().join("|") || "none";
    return `procedure-viewer-${ids}`;
  }, [procedures]);

  const persistedId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(`${storageKey}-selected`);
  }, [storageKey]);

  const resolvedSelectedId = selectedId === undefined ? persistedId : selectedId;
  const selected = resolvedSelectedId ? procedures.find((p) => p.id === resolvedSelectedId) ?? null : null;
  const resolvedFilter = filter ?? (selected ? selected.type : "ALL");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resolvedSelectedId) {
      window.localStorage.setItem(`${storageKey}-selected`, resolvedSelectedId);
    } else {
      window.localStorage.removeItem(`${storageKey}-selected`);
    }
  }, [resolvedSelectedId, storageKey]);

  const filtered = resolvedFilter === "ALL" ? procedures : procedures.filter((p) => p.type === resolvedFilter);

  const grouped = filtered.reduce<Record<string, Procedure[]>>((acc, p) => {
    const key = p.runway || "Unknown";
    acc[key] = acc[key] ? [...acc[key], p] : [p];
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { key: "ALL", label: "All" },
          { key: "SID", label: "SIDs" },
          { key: "STAR", label: "STARs" },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setFilter(opt.key)}
            className={`rounded-full border px-3 py-1 ${resolvedFilter === opt.key ? "border-[color:var(--primary)] bg-[color:var(--surface-3)] text-[color:var(--text-primary)]" : "border-[color:var(--border)] text-[color:var(--text-muted)] hover:border-[color:var(--primary)]"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([rwy, list]) => (
        <div key={rwy} className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2" style={{ breakInside: "avoid" }}>
          <p className="mb-1 text-sm font-semibold text-[color:var(--text-primary)]">Runway {rwy}</p>
          <div className="flex flex-wrap gap-1 text-xs">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className="rounded bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)] hover:border hover:border-[color:var(--primary)]"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {selected ? (
        <Card className="space-y-3 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {selected.type} {selected.name}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">Runway {selected.runway}</p>
            </div>
            <button
              type="button"
              className="text-xs text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              onClick={() => setSelectedId(null)}
            >
              Close
            </button>
          </div>
          <ProcedureMap
            paths={[
              {
                id: selected.id,
                name: selected.name,
                type: selected.type,
                points: selected.waypoints.map((w) => ({ lat: Number(w.lat), lon: Number(w.lon) })),
              },
            ]}
          />
        </Card>
      ) : null}
    </div>
  );
}
