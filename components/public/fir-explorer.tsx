"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

type NavAid = { id: string; type: "FIX" | "VOR" | "NDB"; code: string; lat: number; lon: number; extra?: string | null };
type Boundary = { id: string; label: string; freqId: string; points: { lat: number; lon: number }[] };
type Frequency = { id: string; station: string; frequency: string; boundaryIds: string[] };

type Props = {
  navAids: NavAid[];
  boundaries: Boundary[];
  frequencies: Frequency[];
};

const FirMap = dynamic(() => import("@/components/public/fir-map").then((m) => m.FirMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
});

export function FirExplorer({ navAids, boundaries, frequencies }: Props) {
  const [activeBoundaryIds, setActiveBoundaryIds] = useState<string[]>([]);

  const activeBoundaries = useMemo(
    () => boundaries.filter((b) => activeBoundaryIds.includes(b.id)),
    [boundaries, activeBoundaryIds],
  );

  // Show nav aids only when no boundary is toggled to avoid cluttering the boundary view.
  const navAidsToShow = activeBoundaries.length === 0 ? navAids : [];

  const toggleBoundaryByFreq = (freqId: string) => {
    const boundaryIds = boundaries.filter((b) => b.freqId === freqId).map((b) => b.id);
    if (!boundaryIds.length) return;
    const next = activeBoundaryIds.some((id) => boundaryIds.includes(id)) ? [] : boundaryIds;
    setActiveBoundaryIds(next);
  };

  const showMap = activeBoundaries.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {frequencies.map((f) => {
          const hasBoundary = f.boundaryIds.length > 0;
          const isActive = hasBoundary && f.boundaryIds.some((id) => activeBoundaryIds.includes(id));
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => hasBoundary && toggleBoundaryByFreq(f.id)}
              className={`inline-flex items-center gap-2 rounded border px-3 py-1 ${
                isActive
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)]"
              } ${hasBoundary ? "cursor-pointer" : "cursor-default opacity-75"}`}
            >
              <span className="font-semibold">{f.station}</span>
              <span>{f.frequency}</span>
              {hasBoundary ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive ? "bg-[color:var(--primary)] text-white" : "bg-[color:var(--surface-3)] text-[color:var(--text-muted)]"
                  }`}
                >
                  Boundary
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {showMap ? (
        <FirMap navAids={navAidsToShow} boundaries={activeBoundaries} />
      ) : (
        <p className="text-sm text-[color:var(--text-muted)]">Select a frequency with boundary to view on map.</p>
      )}
    </div>
  );
}
