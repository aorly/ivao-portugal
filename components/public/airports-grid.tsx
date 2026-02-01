"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Airport = {
  id: string;
  icao: string;
  iata: string | null;
  name: string;
  featured?: boolean;
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
    return airports
      .filter((a) => {
        const matchesQuery =
          !q ||
          a.icao.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.iata ?? "").toLowerCase().includes(q);
        const matchesFir = !firFilter || a.fir === firFilter;
        return matchesQuery && matchesFir;
      })
      .sort((a, b) => {
        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        const firCompare = a.fir.localeCompare(b.fir);
        if (firCompare !== 0) return firCompare;
        return a.icao.localeCompare(b.icao);
      });
  }, [airports, query, firFilter]);

  const featured = filtered.filter((airport) => airport.featured);
  const regular = filtered.filter((airport) => !airport.featured);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label htmlFor={searchId} className="sr-only">
          Search airports
        </label>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            id={searchId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ICAO, IATA or name..."
            className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] py-3 pl-9 pr-3 text-sm text-[color:var(--text-primary)] shadow-sm"
          />
        </div>
        <div
          className="flex flex-wrap gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-xs"
          role="group"
          aria-label="Filter by FIR"
        >
          <button
            type="button"
            onClick={() => setFirFilter(null)}
            aria-pressed={!firFilter}
            className={`rounded-xl px-4 py-2 font-semibold transition ${!firFilter ? "bg-[color:var(--primary)] text-white shadow-[var(--shadow-soft)]" : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]"}`}
          >
            All FIRs
          </button>
          {firOptions.map((fir) => (
            <button
              key={fir}
              type="button"
              onClick={() => setFirFilter((prev) => (prev === fir ? null : fir))}
              aria-pressed={firFilter === fir}
              className={`rounded-xl px-4 py-2 font-semibold transition ${firFilter === fir ? "bg-[color:var(--primary)] text-white shadow-[var(--shadow-soft)]" : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-2)]"}`}
            >
              {fir}
            </button>
          ))}
        </div>
      </div>

      {featured.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Primary hubs</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((airport) => (
              <Link key={airport.id} href={`/${locale}/airports/${airport.icao.toLowerCase()}`} className="group">
                <Card className="relative h-full space-y-4 overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:-translate-y-0.5 hover:border-[color:var(--primary)]/40 hover:shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    <span>
                      {airport.fir} / {airport.icao}
                    </span>
                    {airport.iata ? (
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                        {airport.iata}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[color:var(--text-primary)]">{airport.icao}</h3>
                    <p className="text-sm text-[color:var(--text-muted)]">{airport.name}</p>
                  </div>
                  {airport.stands > 0 || airport.sids > 0 || airport.stars > 0 ? (
                    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text-muted)]">
                      {airport.stands > 0 ? (
                        <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-1 text-[color:var(--success)]">
                          Stands {airport.stands}
                        </span>
                      ) : null}
                      {airport.sids > 0 ? (
                        <span className="rounded-full bg-[color:var(--primary)]/12 px-2 py-1 text-[color:var(--primary)]">
                          SIDs {airport.sids}
                        </span>
                      ) : null}
                      {airport.stars > 0 ? (
                        <span className="rounded-full bg-[color:var(--warning)]/18 px-2 py-1 text-[color:var(--warning)]">
                          STARs {airport.stars}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">All airports</h3>
          <span className="text-xs text-[color:var(--text-muted)]">Showing {regular.length} results</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {regular.map((airport) => (
            <Link key={airport.id} href={`/${locale}/airports/${airport.icao.toLowerCase()}`} className="group">
              <Card className="relative h-full space-y-3 overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] p-3 transition hover:bg-[color:var(--surface-2)]">
                <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  <span>
                    {airport.fir} / {airport.iata ?? "--"}
                  </span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-[color:var(--text-primary)]">{airport.icao}</h4>
                  <p className="text-xs text-[color:var(--text-muted)]">{airport.name}</p>
                </div>
                {airport.stands > 0 || airport.sids > 0 || airport.stars > 0 ? (
                  <div className="flex gap-2 text-[10px] font-semibold uppercase tracking-[0.04em]">
                    {airport.stands > 0 ? (
                      <span className="rounded-full bg-[color:var(--success)]/15 px-2 py-1 text-[color:var(--success)]">
                        St. {airport.stands}
                      </span>
                    ) : null}
                    {airport.sids > 0 ? (
                      <span className="rounded-full bg-[color:var(--primary)]/12 px-2 py-1 text-[color:var(--primary)]">
                        Si. {airport.sids}
                      </span>
                    ) : null}
                    {airport.stars > 0 ? (
                      <span className="rounded-full bg-[color:var(--warning)]/18 px-2 py-1 text-[color:var(--warning)]">
                        St. {airport.stars}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <Card className="border border-[color:var(--border)] p-4">
          <p role="status" className="text-sm text-[color:var(--text-muted)]">
            No airports match your filters.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
