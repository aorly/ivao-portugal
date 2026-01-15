"use client";

import { useId, useMemo, useState } from "react";
import type { SignificantPoint } from "@/lib/significant-points";

type Props = {
  points: SignificantPoint[];
};

export function SignificantPointsBrowser({ points }: Props) {
  const [query, setQuery] = useState("");
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return points;
    return points.filter(
      (p) => p.location.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [points, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={searchId} className="sr-only">
          Search significant points
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or code"
          className="w-full sm:w-80 md:w-96 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] shadow-sm"
        />
      </div>

      <div className="max-h-[650px] overflow-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] shadow-sm">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[2fr_1fr_1.4fr_1fr] gap-3 border-b border-[color:var(--border)] px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
            <span>Location</span>
            <span>Code</span>
            <span>Coordinates</span>
            <span>Map</span>
          </div>
          <div className="divide-y divide-[color:var(--border)]">
            {filtered.map((point) => {
              const hasCoords = Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
              const mapHref = hasCoords
                ? `https://www.google.com/maps?q=${point.latitude},${point.longitude}`
                : null;
              return (
                <div
                  key={`${point.code}-${point.location}`}
                  className="grid grid-cols-[2fr_1fr_1.4fr_1fr] items-center gap-3 px-4 py-3 text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[color:var(--text-primary)]">{point.location}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{point.rawCoordinates}</p>
                  </div>
                  <p className="font-mono text-[color:var(--primary)]">{point.code}</p>
                  {hasCoords ? (
                    <p className="text-sm text-[color:var(--text-primary)]">
                      {point.latitude?.toFixed(4)}, {point.longitude?.toFixed(4)}
                    </p>
                  ) : (
                    <p className="text-xs text-[color:var(--text-muted)]">Coordinate parse missing</p>
                  )}
                  {mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-full bg-[color:var(--primary)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--primary)] transition hover:bg-[color:var(--primary)]/20"
                      aria-label={`View ${point.location} on map`}
                    >
                      View map
                    </a>
                  ) : (
                    <span className="text-xs text-[color:var(--text-muted)]">Map unavailable</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div role="status" className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--text-muted)]">
          No significant points match your search.
        </div>
      ) : null}
    </div>
  );
}
