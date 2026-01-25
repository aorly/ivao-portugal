"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  className?: string;
  selectedIcao?: string;
  onSelectIcao?: (icao: string) => void;
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

export function AirportTimetable({ airports, labels, allowPicker = true, className, selectedIcao, onSelectIcao }: Props) {
  const [internalSelected, setInternalSelected] = useState(airports[0]?.icao ?? "");
  const activeSelected = selectedIcao ?? internalSelected;
  const setSelected = useCallback(
    (icao: string) => {
      if (onSelectIcao) {
        onSelectIcao(icao);
      } else {
        setInternalSelected(icao);
      }
    },
    [onSelectIcao],
  );
  const [activeTab, setActiveTab] = useState<"inbound" | "outbound">("inbound");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inbound, setInbound] = useState<Flight[]>([]);
  const [outbound, setOutbound] = useState<Flight[]>([]);
  const [metar, setMetar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const canPick = useMemo(() => (allowPicker ?? true) && airports.length > 1, [allowPicker, airports.length]);

  const selectedAirport = useMemo(
    () => airports.find((airport) => airport.icao === activeSelected),
    [airports, activeSelected],
  );

  useEffect(() => {
    if (!airports.length) return;
    const hasSelected = airports.some((airport) => airport.icao === activeSelected);
    if (!hasSelected) {
      setSelected(airports[0]!.icao);
    }
  }, [airports, activeSelected, setSelected]);

  useEffect(() => {
    if (!activeSelected) return;
    const controller = new AbortController();
    const fetchFlights = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/airports/${activeSelected}/live`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        setInbound(Array.isArray(data.inbound) ? data.inbound : []);
        setOutbound(Array.isArray(data.outbound) ? data.outbound : []);
        setMetar(typeof data.metar === "string" ? data.metar : null);
        setUpdatedAt(formatTime());
      } catch {
        if (controller.signal.aborted) return;
        setError(labels.error);
        setInbound([]);
        setOutbound([]);
        setMetar(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchFlights();
    return () => controller.abort();
  }, [activeSelected, labels.error]);

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
    <Card
      className={cn(
        "w-full space-y-6 border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
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
                        setSelected(airport.icao);
                        setPickerOpen(false);
                      }}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-[color:var(--surface-2)]",
                        activeSelected === airport.icao
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

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3 text-xs">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">METAR</p>
        <p className="mt-1 break-words font-mono text-[11px] text-[color:var(--text-primary)]">{metar ?? "-"}</p>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "inbound", label: labels.inbound, count: inbound.length },
              { key: "outbound", label: labels.outbound, count: outbound.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] transition",
                activeTab === tab.key
                  ? "border-[color:var(--primary)] bg-[color:var(--surface)] text-[color:var(--primary)]"
                  : "border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  activeTab === tab.key ? "bg-[color:var(--primary)]/15 text-[color:var(--primary)]" : "bg-[color:var(--surface)] text-[color:var(--text-muted)]",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4">
          {activeTab === "inbound" ? (
            inbound.length === 0 ? (
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
            )
          ) : outbound.length === 0 ? (
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
