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
  "rounded-md border border-[#1f2530] bg-[#111620] px-3 py-2 text-xs font-mono tracking-[0.24em] uppercase text-[#f5f7fb] shadow-inner";

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
      } catch (err) {
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

  const renderFlightCard = (flight: Flight) => (
    <div
      key={`${flight.callsign ?? "unknown"}-${flight.dep ?? "dep"}-${flight.arr ?? "arr"}`}
      className="grid grid-cols-[1fr_1.2fr_0.9fr] items-center gap-2 rounded-xl border border-[#1f2530] bg-[#0c1018] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    >
      <div className={cn(boardCell, "text-sm tracking-[0.18em]")}>{flight.callsign ?? "UNKNOWN"}</div>
      <div className="flex items-center gap-2">
        <div className={boardCell}>{flight.dep ?? "---"}</div>
        <div className="font-mono text-[10px] text-[#f9cc2c]">&rarr;</div>
        <div className={boardCell}>{flight.arr ?? "---"}</div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className={cn(boardCell, "text-[11px] tracking-[0.14em] text-[#8b91a0]")}>{flight.aircraft ?? "-"}</span>
        {flight.state ? (
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
              stateChipClasses(flight.state),
            )}
          >
            {flight.state}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card className="space-y-6 border-[#1f2530] bg-[#05070c] text-white shadow-[0_35px_90px_rgba(0,0,0,0.55)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8b91a0]">{labels.choose}</p>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-[#1f2530] bg-[#0c1018] px-4 py-3 shadow-inner">
              <p className="font-mono text-2xl tracking-[0.24em] text-[#f5f7fb]">{selectedAirport?.icao ?? "LPXX"}</p>
              {selectedAirport?.name ? (
                <p className="text-[12px] font-semibold text-[#9aa0ad]">{selectedAirport.name}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 text-[12px] text-[#9aa0ad]">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#24ff7c] shadow-[0_0_0_6px_rgba(36,255,124,0.12)]" />
                <span className="font-semibold uppercase tracking-[0.12em] text-[#24ff7c]">{labels.updated}</span>
                {updatedAt ? <span className="font-mono text-xs text-[#c3c8d3]">{updatedAt}</span> : null}
              </div>
              {loading ? <span className="font-mono text-xs text-[#f9cc2c]">{labels.loading}</span> : null}
              {error ? <span className="font-mono text-xs text-[#f87171]">{error}</span> : null}
            </div>
          </div>
        </div>
        {canPick ? (
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="border-[#2a3140] bg-[#0d1119] text-[#f5f7fb] hover:border-[#f9cc2c] hover:text-[#f9cc2c]"
              onClick={() => setPickerOpen((open) => !open)}
            >
              {labels.button}
            </Button>
            {pickerOpen ? (
              <div className="absolute right-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-2xl border border-[#1f2530] bg-[#05070c] shadow-2xl">
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
                        "flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-[#101521]",
                        selectedIcao === airport.icao ? "bg-[#151c2b] text-[#f9cc2c]" : "text-[#d8dbe3]",
                      )}
                    >
                      <span className="font-mono text-base tracking-[0.18em]">{airport.icao}</span>
                      {airport.name ? <span className="text-[12px] text-[#8b91a0]">{airport.name}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-[#1f2530] bg-gradient-to-br from-[#0c111a] via-[#0b0f17] to-[#0c111a] p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#f5f7fb]">{labels.inbound}</p>
            <span className="rounded-full bg-[#111620] px-3 py-1 text-[10px] font-semibold text-[#f9cc2c] shadow-inner">
              {inbound.length}
            </span>
          </div>
          {inbound.length === 0 ? (
            <p className="text-sm text-[#8b91a0]">{labels.empty}</p>
          ) : (
            <div className="space-y-2">{inbound.map(renderFlightCard)}</div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[#1f2530] bg-gradient-to-br from-[#0c111a] via-[#0b0f17] to-[#0c111a] p-4 shadow-inner">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#f5f7fb]">{labels.outbound}</p>
            <span className="rounded-full bg-[#111620] px-3 py-1 text-[10px] font-semibold text-[#f9cc2c] shadow-inner">
              {outbound.length}
            </span>
          </div>
          {outbound.length === 0 ? (
            <p className="text-sm text-[#8b91a0]">{labels.empty}</p>
          ) : (
            <div className="space-y-2">{outbound.map(renderFlightCard)}</div>
          )}
        </div>
      </div>
    </Card>
  );
}
