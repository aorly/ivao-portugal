"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StandMap } from "@/components/map/stand-map";

type Stand = { id: string; name: string; lat: number; lon: number; occupied: boolean; occupant?: { callsign?: string; aircraft?: string } | null };
type Atc = { callsign: string; frequency?: string };
type Traffic = { callsign: string; aircraft?: string; state?: string }[];

type Props = {
  icao: string;
  initialMetar: string | null;
  initialTaf: string | null;
  initialStands: Stand[];
  initialInbound: Traffic;
  initialOutbound: Traffic;
  hasTrafficData: boolean;
  initialAtc: Atc[];
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

export function LiveAirportPanels({
  icao,
  initialMetar,
  initialTaf,
  initialStands,
  initialInbound,
  initialOutbound,
  hasTrafficData,
  initialAtc,
}: Props) {
  const [metar, setMetar] = useState(initialMetar);
  const [taf, setTaf] = useState(initialTaf);
  const [stands, setStands] = useState<Stand[]>(initialStands);
  const [inbound, setInbound] = useState<Traffic>(initialInbound);
  const [outbound, setOutbound] = useState<Traffic>(initialOutbound);
  const [atc, setAtc] = useState<Atc[]>(initialAtc);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/airports/${icao}/live`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMetar(data.metar ?? metar);
        setTaf(data.taf ?? taf);
        setStands(Array.isArray(data.stands) ? data.stands : []);
        setInbound(Array.isArray(data.inbound) ? data.inbound : []);
        setOutbound(Array.isArray(data.outbound) ? data.outbound : []);
        setAtc(Array.isArray(data.atc) ? data.atc : []);
      } catch {
        // ignore errors; keep last good data
      }
    };
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
  }, [icao]);

  const occupied = stands.filter((s) => s.occupied);

  return (
    <>
      {atc.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-[color:var(--danger)]/15 px-3 py-2 text-xs font-semibold text-[color:var(--danger)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--danger)]" />
          <span>ATC Online</span>
          <div className="flex flex-wrap gap-1 text-[10px]">
            {atc.map((a) => (
              <span key={`${a.callsign}-${a.frequency ?? "freq"}`} className="rounded bg-[color:var(--surface-2)] px-2 py-0.5 text-[color:var(--danger)]">
                {a.callsign}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <div>
              <p className="text-sm text-[color:var(--text-muted)]">METAR</p>
              <p className="text-base font-semibold text-[color:var(--text-primary)]">{metar ?? "—"}</p>
            </div>
            <div>
              <p className="text-sm text-[color:var(--text-muted)]">TAF</p>
              <p className="text-sm text-[color:var(--text-primary)]">{taf ?? "—"}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Stands</p>
        {stands.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No stands published.</p>
        ) : (
          <>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 space-y-2">
              <div className="flex items-center gap-3 text-xs text-[color:var(--text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-[#34d399]" /> Free
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full bg-[#facc15]" /> Occupied
                </span>
                {!hasTrafficData ? <span className="text-[color:var(--text-muted)]">Live occupancy unavailable.</span> : null}
              </div>
              <StandMap stands={stands} />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {occupied.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No occupied stands detected.</p>
              ) : (
                occupied.map((stand) => (
                  <div
                    key={stand.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-[color:var(--text-primary)]"
                    style={{ background: "rgba(234, 179, 8, 0.15)", border: "1px solid rgba(234, 179, 8, 0.4)" }}
                  >
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#facc15]" />
                    <span>{stand.name}</span>
                    {stand.occupant ? (
                      <span className="text-[11px] font-normal text-[color:var(--text-muted)]">
                        {stand.occupant.callsign} {stand.occupant.aircraft ? `• ${stand.occupant.aircraft}` : ""}
                      </span>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Card>

      <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Traffic</p>
        <div className="grid gap-3 md:grid-cols-2 text-xs">
          <div className="space-y-1">
            <p className="text-[color:var(--text-muted)] font-semibold">Inbound</p>
            {inbound.length === 0 ? (
              <p className="text-[color:var(--text-muted)]">No inbound traffic.</p>
            ) : (
              inbound.slice(0, 10).map((p, idx) => (
                <div
                  key={`${p.callsign}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--text-primary)]">{p.callsign || "Unknown"}</p>
                    <p className="text-[10px] text-[color:var(--text-muted)]">{p.aircraft || "Aircraft"}</p>
                  </div>
                  {p.state ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stateChipClasses(p.state)}`}
                    >
                      {p.state}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[color:var(--text-muted)] font-semibold">Outbound</p>
            {outbound.length === 0 ? (
              <p className="text-[color:var(--text-muted)]">No outbound traffic.</p>
            ) : (
              outbound.slice(0, 10).map((p, idx) => (
                <div
                  key={`${p.callsign}-${idx}`}
                  className="flex items-center justify-between gap-2 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--text-primary)]">{p.callsign || "Unknown"}</p>
                    <p className="text-[10px] text-[color:var(--text-muted)]">{p.aircraft || "Aircraft"}</p>
                  </div>
                  {p.state ? (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${stateChipClasses(p.state)}`}
                    >
                      {p.state}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
