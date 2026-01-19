"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { StandMap } from "@/components/map/stand-map";

type Stand = { id: string; name: string; lat: number; lon: number; occupied: boolean; occupant?: { callsign?: string; aircraft?: string } | null };
type Atc = { callsign: string; frequency?: string };
type Traffic = { callsign: string; aircraft?: string; state?: string }[];
type RunwayInfo = { id: string; heading: number | null; length?: number | null };
type WindInfo = { direction: number | null; speed: number | null };
type FavoriteRunway = { id: string; heading: number | null } | null;

type Props = {
  icao: string;
  initialMetar: string | null;
  initialTaf: string | null;
  initialStands: Stand[];
  initialInbound: Traffic;
  initialOutbound: Traffic;
  hasTrafficData: boolean;
  initialAtc: Atc[];
  runways: RunwayInfo[];
  wind: WindInfo | null;
  favoriteRunway?: FavoriteRunway;
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
  runways,
  wind,
  favoriteRunway = null,
}: Props) {
  const [metar, setMetar] = useState(initialMetar);
  const [taf, setTaf] = useState(initialTaf);
  const [stands, setStands] = useState<Stand[]>(initialStands);
  const [inbound, setInbound] = useState<Traffic>(initialInbound);
  const [outbound, setOutbound] = useState<Traffic>(initialOutbound);
  const [atc, setAtc] = useState<Atc[]>(initialAtc);
  const [weatherOpen, setWeatherOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`/api/airports/${icao}/live`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setMetar((prev) => data.metar ?? prev);
        setTaf((prev) => data.taf ?? prev);
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
  const windLabel = wind?.direction
    ? `${String(wind.direction).padStart(3, "0")} / ${wind.speed ?? "-"} kt`
    : "Wind unavailable";

  const headwindForRunway = (heading: number | null) => {
    if (!wind?.direction || !wind?.speed || !heading) return null;
    const diff = Math.abs(((wind.direction - heading + 540) % 360) - 180);
    return Math.round(Math.cos((diff * Math.PI) / 180) * wind.speed);
  };

  const favored = favoriteRunway ?? runways.find((r) => r.heading);

  const parseTemp = (value: string) => (value.startsWith("M") ? `-${value.slice(1)}` : value);
  const parseMetarSummary = (raw: string | null) => {
    if (!raw) return null;
    const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT\b/);
    const visMatch = raw.match(/\b(\d{4})\b/) ?? raw.match(/\b(\d{1,2})SM\b/);
    const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
    const qnhMatch = raw.match(/\bQ(\d{4})\b/) ?? raw.match(/\bA(\d{4})\b/);
    const clouds = Array.from(raw.matchAll(/\b(FEW|SCT|BKN|OVC)(\d{3})\b/g)).map(
      (match) => `${match[1]}${match[2]}`,
    );
    const weatherCodeLabel = (code: string) => {
      const intensity = code.startsWith("+") ? "Heavy" : code.startsWith("-") ? "Light" : "";
      const descriptor = code.includes("TS")
        ? "Thunderstorm"
        : code.includes("SH")
          ? "Showers"
          : code.includes("FZ")
            ? "Freezing"
            : "";
      const base = code.replace(/^[+-]/, "").replace(/TS|SH|FZ/g, "");
      const phenomenon =
        base === "DZ"
          ? "Drizzle"
          : base === "RA"
            ? "Rain"
            : base === "SN"
              ? "Snow"
              : base === "SG"
                ? "Snow grains"
                : base === "PL"
                  ? "Ice pellets"
                  : base === "GR"
                    ? "Hail"
                    : base === "GS"
                      ? "Small hail"
                      : base === "BR"
                        ? "Mist"
                        : base === "FG"
                          ? "Fog"
                          : base === "FU"
                            ? "Smoke"
                            : base === "VA"
                              ? "Volcanic ash"
                              : base === "DU"
                                ? "Dust"
                                : base === "SA"
                                  ? "Sand"
                                  : base === "HZ"
                                    ? "Haze"
                                    : base === "SQ"
                                      ? "Squalls"
                                      : base === "FC"
                                        ? "Funnel cloud"
                                        : base === "SS"
                                          ? "Sandstorm"
                                          : base === "DS"
                                            ? "Duststorm"
                                            : "";
      const parts = [intensity, descriptor, phenomenon].filter(Boolean);
      return parts.length ? parts.join(" ") : code;
    };
    const weather = Array.from(
      raw.matchAll(/\b(\+|-)?(TS|SH|FZ)?(DZ|RA|SN|SG|PL|GR|GS|BR|FG|FU|VA|DU|SA|HZ|SQ|FC|SS|DS)\b/g),
    )
      .map((match) => `${match[1] ?? ""}${match[2] ?? ""}${match[3] ?? ""}`)
      .filter(Boolean)
      .map(weatherCodeLabel);
    return {
      wind: windMatch
        ? `${windMatch[1]} ${windMatch[2]}${windMatch[3] ? windMatch[3] : ""} kt`
        : "N/A",
      visibility: visMatch
        ? visMatch[0].includes("SM")
          ? `${visMatch[1]} SM`
          : `${visMatch[1]} m`
        : "N/A",
      temp: tempMatch ? `${parseTemp(tempMatch[1])}°C / ${parseTemp(tempMatch[2])}°C` : "N/A",
      qnh: qnhMatch ? `${qnhMatch[1]}${qnhMatch[0].startsWith("A") ? " inHg" : " hPa"}` : "N/A",
      clouds: clouds.length ? clouds.join(" ") : "N/A",
      weather: weather.length ? weather.join(" ") : "N/A",
    };
  };

  const parseTafPeriods = (raw: string | null) => {
    if (!raw) return [];
    const tokens = raw.replace(/\s+/g, " ").trim().split(" ");
    const periods: { id: string; label: string; parts: string[] }[] = [];
    let current: { id: string; label: string; parts: string[] } | null = null;
    let index = 0;

    const startPeriod = (label: string) => {
      if (current) periods.push(current);
      index += 1;
      current = { id: `${label}-${index}`, label, parts: [] };
    };

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i] ?? "";
      if (/^FM\d{6}$/i.test(token)) {
        startPeriod(`FM ${token.slice(2)}`);
        continue;
      }
      if (/^TEMPO$/i.test(token) || /^BECMG$/i.test(token) || /^PROB\d{2}$/i.test(token)) {
        const rangeToken = tokens[i + 1] ?? "";
        const range = /^\d{4}\/\d{4}$/.test(rangeToken) ? rangeToken : "";
        startPeriod(range ? `${token.toUpperCase()} ${range}` : token.toUpperCase());
        if (range) i += 1;
        continue;
      }
      if (!current) {
        startPeriod("INITIAL");
      }
      current!.parts.push(token);
    }
    if (current) periods.push(current);

    return periods.map((period) => {
      const text = period.parts.join(" ");
      const windMatch = text.match(/\b(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT\b/);
      const visMatch = text.match(/\b(\d{4})\b/) ?? text.match(/\b(\d{1,2})SM\b/);
      const clouds = Array.from(text.matchAll(/\b(FEW|SCT|BKN|OVC)(\d{3})\b/g)).map(
        (match) => `${match[1]}${match[2]}`,
      );
      return {
        id: period.id,
        label: period.label,
        wind: windMatch
          ? `${windMatch[1]} ${windMatch[2]}${windMatch[3] ? windMatch[3] : ""} kt`
          : "N/A",
        visibility: visMatch
          ? visMatch[0].includes("SM")
            ? `${visMatch[1]} SM`
            : `${visMatch[1]} m`
          : "N/A",
        clouds: clouds.length ? clouds.join(" ") : "N/A",
      };
    });
  };

  const metarSummary = parseMetarSummary(metar);
  const tafPeriods = parseTafPeriods(taf);

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

      <button type="button" className="w-full text-left" onClick={() => setWeatherOpen(true)}>
        <Card className="space-y-3 p-4 transition hover:border-[color:var(--primary)]" style={{ breakInside: "avoid" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-[color:var(--text-muted)]">METAR</p>
                <p className="text-base font-semibold text-[color:var(--text-primary)]">{metar ?? "-"}</p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--text-muted)]">TAF</p>
                <p className="text-sm text-[color:var(--text-primary)]">{taf ?? "-"}</p>
              </div>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Details</span>
          </div>
        </Card>
      </button>

      {weatherOpen ? (
        <div className="fixed inset-0 z-[1000] isolate flex h-screen w-screen items-center justify-center bg-black/60 p-8">
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Weather briefing</p>
                <p className="text-lg font-semibold">METAR, TAF, and runway wind</p>
              </div>
              <button
                type="button"
                onClick={() => setWeatherOpen(false)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <div className="grid h-full gap-6 overflow-y-auto bg-white p-6 md:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <Card className="space-y-3 border-[color:var(--border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">What you are seeing</p>
                  <p className="text-sm text-[color:var(--text-primary)]">
                    METAR is the current observed weather at the airport. TAF is the short-term forecast that helps
                    plan arrivals and departures.
                  </p>
                </Card>
                <Card className="space-y-3 border-[color:var(--border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">METAR</p>
                  <p className="text-sm font-semibold">{metar ?? "-"}</p>
                </Card>
                {metarSummary ? (
                  <Card className="grid gap-3 border-[color:var(--border)] bg-white p-4 text-xs text-[color:var(--text-muted)] md:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <span>Wind</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.wind}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Visibility</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.visibility}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Temp / Dew</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.temp}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>QNH</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.qnh}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Clouds</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.clouds}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Weather</span>
                      <span className="font-semibold text-[color:var(--text-primary)]">{metarSummary.weather}</span>
                    </div>
                  </Card>
                ) : null}
                <Card className="space-y-3 border-[color:var(--border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">TAF</p>
                  <p className="text-sm text-[color:var(--text-primary)]">{taf ?? "-"}</p>
                </Card>
                {tafPeriods.length ? (
                  <Card className="space-y-3 border-[color:var(--border)] bg-white p-4 text-xs text-[color:var(--text-muted)]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">TAF periods</p>
                    <div className="space-y-2">
                      {tafPeriods.map((period) => (
                        <div
                          key={period.id}
                          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-primary)]">
                              {period.label}
                            </p>
                            <p className="text-[11px] text-[color:var(--text-muted)]">{period.wind}</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-[color:var(--text-muted)]">
                            <span>Vis {period.visibility}</span>
                            <span>Clouds {period.clouds}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ) : (
                  <Card className="space-y-2 border-[color:var(--border)] bg-white p-4 text-xs text-[color:var(--text-muted)]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">TAF</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{taf ?? "-"}</p>
                  </Card>
                )}
              </div>
              <div className="space-y-4">
                <Card className="space-y-3 border-[color:var(--border)] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Wind</p>
                    <p className="text-xs font-semibold text-[color:var(--text-primary)]">{windLabel}</p>
                  </div>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    Positive headwind values favor a runway. Negative values suggest tailwind.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="relative flex h-36 w-36 items-center justify-center rounded-full border border-[color:var(--border)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.18), rgba(255,255,255,0.92) 55%)",
                      }}
                    >
                      <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-semibold text-[color:var(--text-muted)]">
                        N
                      </span>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[color:var(--text-muted)]">
                        E
                      </span>
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[color:var(--text-muted)]">
                        S
                      </span>
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[color:var(--text-muted)]">
                        W
                      </span>
                      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(148,163,184,0.4)" strokeWidth="2" />
                        <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1" />
                        <g stroke="rgba(148,163,184,0.4)" strokeWidth="2">
                          <line x1="60" y1="10" x2="60" y2="18" />
                          <line x1="60" y1="102" x2="60" y2="110" />
                          <line x1="10" y1="60" x2="18" y2="60" />
                          <line x1="102" y1="60" x2="110" y2="60" />
                        </g>
                        {favored?.heading ? (
                          <g
                            style={{
                              transform: `rotate(${favored.heading}deg)`,
                              transformOrigin: "60px 60px",
                            }}
                          >
                            <rect x="56" y="26" width="8" height="68" rx="3" fill="rgba(15,23,42,0.25)" />
                            <line x1="60" y1="32" x2="60" y2="88" stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
                          </g>
                        ) : null}
                        <g
                          style={{
                            transform: `rotate(${wind?.direction ?? 0}deg)`,
                            transformOrigin: "60px 60px",
                          }}
                        >
                          <path
                            d="M60 20 L64 52 L60 60 L56 52 Z"
                            fill="rgb(37,99,235)"
                          />
                          <rect x="58.6" y="20" width="2.8" height="24" rx="1.4" fill="rgba(37,99,235,0.55)" />
                        </g>
                        <circle cx="60" cy="60" r="4" fill="rgb(15,23,42)" />
                      </svg>
                    </div>
                    <div className="space-y-2 text-xs text-[color:var(--text-muted)]">
                      <div className="flex items-center justify-between gap-4">
                        <span>Direction</span>
                        <span className="font-semibold text-[color:var(--text-primary)]">
                          {wind?.direction ? String(wind.direction).padStart(3, "0") : "--"}°
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Speed</span>
                        <span className="font-semibold text-[color:var(--text-primary)]">{wind?.speed ?? "--"} kt</span>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="space-y-3 border-[color:var(--border)] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Runways</p>
                  {runways.length === 0 ? (
                    <p className="text-sm text-[color:var(--text-muted)]">No runway data available.</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      {runways.map((runway) => {
                        const headwind = headwindForRunway(runway.heading);
                        const headwindLabel =
                          headwind === null ? "-- kt" : `${headwind >= 0 ? "+" : ""}${headwind} kt`;
                        return (
                          <div
                            key={runway.id}
                            className="rounded-xl border border-[color:var(--border)] bg-white p-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold">{runway.id}</p>
                                  <span className="text-[11px] text-[color:var(--text-muted)]">
                                    Heading {runway.heading ?? "--"}°
                                  </span>
                                </div>
                                <div className="relative mt-2 h-5 rounded-full bg-[color:var(--surface-2)]">
                                  <div className="absolute inset-y-1 left-4 right-4 rounded-full bg-[color:var(--text-primary)]/90" />
                                  <div className="absolute inset-y-1 left-4 right-4 rounded-full border border-white/70" />
                                  <div className="absolute left-1/2 top-1 bottom-1 w-1 rounded-full bg-white/70" />
                                  <div className="absolute left-5 top-1 h-3 w-2 rounded-full bg-white/90" />
                                  <div className="absolute right-5 top-1 h-3 w-2 rounded-full bg-white/90" />
                                </div>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-xs font-semibold ${
                                    headwind !== null && headwind < 0
                                      ? "text-[color:var(--danger)]"
                                      : "text-[color:var(--text-primary)]"
                                  }`}
                                >
                                  {headwindLabel}
                                </p>
                                <p className="text-[11px] text-[color:var(--text-muted)]">
                                  {runway.length ? `${runway.length} m` : "-- m"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                        {stand.occupant.callsign} {stand.occupant.aircraft ? `- ${stand.occupant.aircraft}` : ""}
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
