"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AirportOption = { icao: string; name?: string | null };
type Flight = { callsign?: string; aircraft?: string; state?: string; dep?: string; arr?: string };
type Labels = {
  choose: string;
  button: string;
  inbound: string;
  outbound: string;
  empty: string;
  loading: string;
  error: string;
  updated: string;
};

type Props = {
  airports: AirportOption[];
  labels: Labels;
  allowPicker?: boolean;
};

const stateChipClasses = (state: string) => {
  const key = state.toLowerCase();
  if (key.includes("taxi") || key.includes("stand") || key.includes("ground"))
    return "bg-[#fff7ed] text-[#9a3412] border-[#fed7aa]";
  if (key.includes("desc") || key.includes("approach") || key.includes("arriv") || key.includes("land"))
    return "bg-[#ecfdf3] text-[#166534] border-[#bbf7d0]";
  if (key.includes("dep") || key.includes("climb") || key.includes("takeoff"))
    return "bg-[#e0f2fe] text-[#1d4ed8] border-[#bfdbfe]";
  if (key.includes("en route") || key.includes("cruise"))
    return "bg-[#e0f7fa] text-[#0f766e] border-[#bae6fd]";
  return "bg-[color:var(--surface-3)] text-[color:var(--text-primary)] border-[color:var(--border)]";
};

const formatTime = () => {
  const now = new Date();
  return now.toISOString().slice(11, 16) + "Z";
};

const boardCell =
  "whitespace-nowrap px-2 py-1 text-[11px] font-mono uppercase tracking-[0.2em] text-[color:var(--text-primary)]";

export function AirportTimetable({ airports, labels, allowPicker = true }: Props) {
  const [selectedIcao, setSelectedIcao] = useState(airports[0]?.icao ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inbound, setInbound] = useState<Flight[]>([]);
  const [outbound, setOutbound] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const canPick = useMemo(() => (allowPicker ?? true) && airports.length > 1, [allowPicker, airports.length]);

  const selectedAirport = useMemo(
    () => airports.find((airport) => airport.icao === selectedIcao),
    [airports, selectedIcao],
  );

  useEffect(() => {
    if (!airports.length) return;
    const hasSelected = airports.some((airport) => airport.icao === selectedIcao);
    if (!hasSelected) {
      setSelectedIcao(airports[0]!.icao);
    }
  }, [airports, selectedIcao]);

  useEffect(() => {
    if (!selectedIcao) return;
    const controller = new AbortController();
    const fetchFlights = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/airports/${selectedIcao}/live`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setInbound(Array.isArray(data.inbound) ? data.inbound : []);
        setOutbound(Array.isArray(data.outbound) ? data.outbound : []);
        setUpdatedAt(formatTime());
      } catch {
        if (controller.signal.aborted) return;
        setError(labels.error);
        setInbound([]);
        setOutbound([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchFlights();
    return () => controller.abort();
  }, [selectedIcao, labels.error]);

  const renderFlightRow = (flight: Flight) => (
    <div
      key={`${flight.callsign ?? "unknown"}-${flight.dep ?? "dep"}-${flight.arr ?? "arr"}`}
      className="grid grid-cols-[1fr_1.1fr_0.9fr_0.9fr] items-center gap-2 px-2 py-1.5 text-[11px] text-[color:var(--text-primary)]"
    >
      <span className={cn(boardCell, "tracking-[0.16em]")}>{flight.callsign ?? "UNKNOWN"}</span>
      <span className="flex items-center gap-2 font-mono">
        <span className={boardCell}>{flight.dep ?? "---"}</span>
        <span className="text-[10px] text-[color:var(--warning)]">&rarr;</span>
        <span className={boardCell}>{flight.arr ?? "---"}</span>
      </span>
      <span className={cn(boardCell, "text-[10px] tracking-[0.12em] text-[color:var(--text-muted)]")}>
        {flight.aircraft ?? "-"}
      </span>
      <span className="flex items-center justify-end">
        {flight.state ? (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
              stateChipClasses(flight.state),
            )}
          >
            {flight.state}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">Unknown</span>
        )}
      </span>
    </div>
  );

  return (
    <Card className="w-full space-y-6 border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">{labels.choose}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
              <p className="font-mono text-2xl tracking-[0.24em] text-[color:var(--text-primary)]">
                {selectedAirport?.icao ?? "LPXX"}
              </p>
              {selectedAirport?.name ? (
                <p className="text-[12px] font-semibold text-[color:var(--text-muted)]">{selectedAirport.name}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 text-[12px] text-[color:var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[color:var(--success)] shadow-[0_0_0_6px_rgba(46,198,98,0.18)]" />
                <span className="font-semibold uppercase tracking-[0.12em] text-[color:var(--success)]">
                  {labels.updated}
                </span>
                {updatedAt ? (
                  <span className="font-mono text-xs text-[color:var(--text-muted)]">{updatedAt}</span>
                ) : null}
              </div>
              {loading ? <span className="font-mono text-xs text-[color:var(--warning)]">{labels.loading}</span> : null}
              {error ? <span className="font-mono text-xs text-[color:var(--danger)]">{error}</span> : null}
            </div>
          </div>
        </div>
        {canPick ? (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
              onClick={() => setPickerOpen((open) => !open)}
            >
              {labels.button}
            </Button>
            {pickerOpen ? (
              <div className="absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-soft)]">
                <div className="max-h-72 overflow-y-auto">
                  {airports.map((airport) => (
                    <button
                      key={airport.icao}
                      type="button"
                      onClick={() => {
                        setSelectedIcao(airport.icao);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-[color:var(--surface-2)]",
                        selectedIcao === airport.icao
                          ? "bg-[color:var(--surface-3)] text-[color:var(--primary)]"
                          : "text-[color:var(--text-primary)]",
                      )}
                    >
                      <span className="font-mono text-base tracking-[0.18em]">{airport.icao}</span>
                      {airport.name ? (
                        <span className="text-[12px] text-[color:var(--text-muted)]">{airport.name}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--text-primary)]">
              {labels.inbound}
            </p>
            <span className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-[10px] font-semibold text-[color:var(--warning)]">
              {inbound.length}
            </span>
          </div>
          {inbound.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              <div className="min-w-[440px]">
                <div className="grid grid-cols-[1fr_1.1fr_0.9fr_0.9fr] gap-2 border-b border-[color:var(--border)] px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  <span>Callsign</span>
                  <span>Route</span>
                  <span>Aircraft</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-[color:var(--border)]">
                  {inbound.map(renderFlightRow)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--text-primary)]">
              {labels.outbound}
            </p>
            <span className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-[10px] font-semibold text-[color:var(--warning)]">
              {outbound.length}
            </span>
          </div>
          {outbound.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{labels.empty}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]">
              <div className="min-w-[440px]">
                <div className="grid grid-cols-[1fr_1.1fr_0.9fr_0.9fr] gap-2 border-b border-[color:var(--border)] px-2 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  <span>Callsign</span>
                  <span>Route</span>
                  <span>Aircraft</span>
                  <span className="text-right">Status</span>
                </div>
                <div className="divide-y divide-[color:var(--border)]">
                  {outbound.map(renderFlightRow)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
