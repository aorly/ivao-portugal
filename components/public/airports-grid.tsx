"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Airport = {
  id: string;
  icao: string;
  iata: string | null;
  name: string;
  fir: string;
  stands: number;
  sids: number;
  stars: number;
  updatedAt: string | Date;
};

export function AirportsGrid({ airports, locale }: { airports: Airport[]; locale: string }) {
  const [query, setQuery] = useState("");
  const [firFilter, setFirFilter] = useState<string | null>(null);
  const searchId = useId();

  const firOptions = useMemo(() => {
    const set = new Set(airports.map((a) => a.fir).filter(Boolean));
    return Array.from(set).sort();
  }, [airports]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return airports.filter((a) => {
      const matchesQuery =
        !q ||
        a.icao.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.iata ?? "").toLowerCase().includes(q);
      const matchesFir = !firFilter || a.fir === firFilter;
      return matchesQuery && matchesFir;
    });
  }, [airports, query, firFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <label htmlFor={searchId} className="sr-only">
          Search airports
        </label>
        <input
          id={searchId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ICAO, IATA or name..."
          className="w-full md:w-80 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] shadow-sm"
        />
        <div className="flex flex-wrap gap-2 text-xs" role="group" aria-label="Filter by FIR">
          <button
            type="button"
            onClick={() => setFirFilter(null)}
            aria-pressed={!firFilter}
            className={`rounded-full border px-3 py-1 ${!firFilter ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]" : "border-[color:var(--border)] text-[color:var(--text-primary)]"}`}
          >
            All FIRs
          </button>
          {firOptions.map((fir) => (
            <button
              key={fir}
              type="button"
              onClick={() => setFirFilter((prev) => (prev === fir ? null : fir))}
              aria-pressed={firFilter === fir}
              className={`rounded-full border px-3 py-1 ${firFilter === fir ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]" : "border-[color:var(--border)] text-[color:var(--text-primary)]"}`}
            >
              {fir}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((airport) => (
          <Link key={airport.id} href={`/${locale}/airports/${airport.icao.toLowerCase()}`} className="group">
            <Card className="relative h-full space-y-3 overflow-hidden border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)]/80 via-[color:var(--surface-2)] to-[color:var(--surface-3)] p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--primary)] group-focus-visible:ring-2 group-focus-visible:ring-[color:var(--primary)] group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[color:var(--surface)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{airport.fir}</p>
                  <h3 className="text-2xl font-bold text-[color:var(--text-primary)]">{airport.icao}</h3>
                  <p className="text-sm text-[color:var(--text-muted)]">{airport.name}</p>
                </div>
                {airport.iata ? <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-1 text-xs text-[color:var(--text-primary)]">{airport.iata}</span> : null}
              </div>
              <p className="text-[11px] text-[color:var(--text-muted)]">
                Last updated{" "}
                <time dateTime={new Date(airport.updatedAt).toISOString()}>
                  {new Date(airport.updatedAt).toLocaleDateString(locale)}
                </time>
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                <span className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">Stands {airport.stands}</span>
                <span className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">SIDs {airport.sids}</span>
                <span className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">STARs {airport.stars}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-4">
          <p role="status" className="text-sm text-[color:var(--text-muted)]">
            No airports match your filters.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
