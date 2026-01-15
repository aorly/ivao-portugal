"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type PilotFlight = {
  id: string;
  direction: "DEP" | "ARR";
  icao: string;
  other?: string;
  callsign?: string;
  aircraft?: string;
  state?: string;
};

type Props = {
  flights: PilotFlight[];
  labels: { title: string; empty: string };
};

export function PilotAirportTabs({ flights, labels }: Props) {
  const stateClasses = (state?: string) => {
    const normalized = state?.toLowerCase().trim() ?? "";
    switch (normalized) {
      case "boarding":
        return "bg-purple-200/20 text-purple-100 border-purple-300/30";
      case "on blocks":
        return "bg-slate-200/30 text-[color:var(--text-primary)] border-slate-300/40";
      case "departing":
        return "bg-amber-200/20 text-amber-100 border-amber-300/30";
      case "initial climb":
        return "bg-orange-200/20 text-orange-100 border-orange-300/30";
      case "en route":
        return "bg-sky-200/20 text-sky-100 border-sky-300/30";
      case "approach":
        return "bg-emerald-200/20 text-emerald-100 border-emerald-300/30";
      case "landed":
        return "bg-rose-200/20 text-rose-100 border-rose-300/30";
      default:
        if (normalized.includes("taxi")) return "bg-amber-200/20 text-amber-100 border-amber-300/30";
        return "bg-[color:var(--surface-2)] text-[color:var(--text-muted)] border-[color:var(--border)]";
    }
  };

  const airports = useMemo(() => {
    const grouped: Record<string, PilotFlight[]> = {};
    flights.forEach((flight) => {
      if (!grouped[flight.icao]) grouped[flight.icao] = [];
      grouped[flight.icao].push(flight);
    });
    return Object.entries(grouped)
      .map(([code, items]) => ({ code, items }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [flights]);

  const [active, setActive] = useState(airports[0]?.code ?? "");
  const activeFlights = airports.find((a) => a.code === active)?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {airports.map((airport) => (
          <Button
            key={airport.code}
            size="sm"
            variant={airport.code === active ? "secondary" : "ghost"}
            className="px-3"
            onClick={() => setActive(airport.code)}
          >
            {airport.code}
          </Button>
        ))}
      </div>
      <div className="grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "260px" }}>
        {activeFlights.length === 0 ? (
          <p className="text-xs text-[color:var(--text-muted)]">{labels.empty}</p>
        ) : (
          activeFlights.map((flight) => (
            <Card
              key={flight.id}
              className="flex items-center justify-between border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-muted)]"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {flight.callsign ?? "Unknown"} · {flight.aircraft ?? "—"}
                </p>
                <p className="text-[11px] uppercase tracking-[0.1em]">
                  {flight.direction === "DEP" ? "Departure" : "Arrival"} {flight.icao}
                  {flight.other ? ` · ${flight.other}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.1em] ${stateClasses(flight.state)}`}
              >
                {flight.state ?? "—"}
              </span>
            </Card>
          ))
        )}
      </div>
      {airports.length === 0 ? (
        <p className="text-xs text-[color:var(--text-muted)]">{labels.empty}</p>
      ) : null}
    </div>
  );
}
