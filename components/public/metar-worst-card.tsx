"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeaturedAirport = { icao: string; name?: string | null; runways?: string | null };
type WorstWeather = {
  icao: string;
  name?: string | null;
  metar: string | null;
  windKts: number;
  visibilityMeters: number;
  rainScore: number;
};

type Labels = {
  title: string;
  subtitle: string;
  empty: string;
};

type Props = {
  featured: FeaturedAirport[];
  initialWorst: WorstWeather | null;
  labels: Labels;
  className?: string;
  refreshIntervalMs?: number;
};

const parseWindKts = (metar: string | null) => {
  if (!metar) return -1;
  const match = metar.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT\b/);
  if (!match) return -1;
  const speed = Number.parseInt(match[2] ?? "0", 10);
  const gust = match[4] ? Number.parseInt(match[4], 10) : 0;
  return Math.max(speed, gust);
};

const parseVisibilityMeters = (metar: string | null) => {
  if (!metar) return Number.POSITIVE_INFINITY;
  const smMatch = metar.match(/\b(\d+)?\s?(\d\/\d)?SM\b/);
  if (smMatch) {
    const whole = smMatch[1] ? Number.parseFloat(smMatch[1]) : 0;
    const frac = smMatch[2]
      ? smMatch[2]
          .split("/")
          .map((v) => Number.parseFloat(v))
          .reduce((num, den) => (den ? num / den : 0))
      : 0;
    const miles = whole + frac;
    return miles > 0 ? miles * 1609.34 : Number.POSITIVE_INFINITY;
  }
  const metersMatch = metar.match(/\b(?!Q|A)(\d{4})\b/);
  if (!metersMatch) return Number.POSITIVE_INFINITY;
  const meters = Number.parseInt(metersMatch[1], 10);
  return Number.isFinite(meters) ? meters : Number.POSITIVE_INFINITY;
};

const parseRainScore = (metar: string | null) => {
  if (!metar) return -1;
  if (/\+RA\b/.test(metar)) return 2;
  if (/(^|\s)[+-]?RA(\s|$)/.test(metar)) return 1;
  return 0;
};

const parseRainLabel = (metar: string | null) => {
  if (!metar) return null;
  if (/\+RA\b/.test(metar)) return "Heavy rain";
  if (/(^|\s)[+-]?RA(\s|$)/.test(metar)) return "Rain";
  return null;
};

const parseTemp = (value: string) => (value.startsWith("M") ? `-${value.slice(1)}` : value);

const parseMetarDetails = (raw: string | null) => {
  if (!raw) return null;
  const windMatch = raw.match(/\b(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT\b/);
  const tempMatch = raw.match(/\b(M?\d{2})\/(M?\d{2})\b/);
  const qnhMatch = raw.match(/\bQ(\d{4})\b/) ?? raw.match(/\bA(\d{4})\b/);
  const clouds = Array.from(raw.matchAll(/\b(FEW|SCT|BKN|OVC)(\d{3})\b/g)).map(
    (match) => `${match[1]}${match[2]}`,
  );
  const weatherCodes = Array.from(raw.matchAll(/\b(\+|-)?(TS|SH|FZ)?(DZ|RA|SN|SG|PL|GR|GS|BR|FG|HZ|SQ|FC)\b/g))
    .map((match) => `${match[1] ?? ""}${match[2] ?? ""}${match[3]}`)
    .filter(Boolean);
  const visibility = (() => {
    const smMatch = raw.match(/\b(\d+)?\s?(\d\/\d)?SM\b/);
    if (smMatch) {
      const whole = smMatch[1] ? Number.parseFloat(smMatch[1]) : 0;
      const frac = smMatch[2]
        ? smMatch[2]
            .split("/")
            .map((v) => Number.parseFloat(v))
            .reduce((num, den) => (den ? num / den : 0))
        : 0;
      const miles = whole + frac;
      return miles > 0 ? `${(miles * 1.60934).toFixed(1)} km` : null;
    }
    const metersMatch = raw.match(/\b(?!Q|A)(\d{4})\b/);
    if (!metersMatch) return null;
    const meters = Number.parseInt(metersMatch[1], 10);
    return Number.isFinite(meters) ? `${(meters / 1000).toFixed(1)} km` : null;
  })();
  const temp = tempMatch ? parseTemp(tempMatch[1]) : null;
  const dew = tempMatch ? parseTemp(tempMatch[2]) : null;
  const qnh = qnhMatch ? (qnhMatch[1] ? `QNH ${qnhMatch[1]}` : null) : null;
  const wind = windMatch
    ? `${windMatch[1]}${windMatch[2]}${windMatch[3] ?? ""}KT`
    : null;
  return { wind, visibility, temp, dew, qnh, clouds, weatherCodes };
};

const formatVisibility = (meters: number) => {
  if (!Number.isFinite(meters) || meters === Number.POSITIVE_INFINITY) return null;
  return `${(meters / 1000).toFixed(1)} km`;
};

const parseRunwayHeadings = (runwaysRaw?: string | null) => {
  if (!runwaysRaw) return [];
  try {
    const parsed = JSON.parse(runwaysRaw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const directHeading = typeof record.heading === "number" ? record.heading : Number(record.heading);
        const derivedHeading = (() => {
          const id = typeof record.id === "string" ? record.id : "";
          const first = id.split(/[\\/]/)[0] ?? "";
          const num = Number.parseInt(first.replace(/\D/g, ""), 10);
          return Number.isFinite(num) ? num * 10 : null;
        })();
        const rawHeading = Number.isFinite(directHeading) ? directHeading : derivedHeading;
        if (typeof rawHeading !== "number" || !Number.isFinite(rawHeading)) return null;
        const normalized = ((rawHeading % 360) + 360) % 360;
        return normalized === 0 ? 360 : normalized;
      })
      .filter((value): value is number => typeof value === "number");
  } catch {
    return [];
  }
};

const parseWind = (metar: string | null) => {
  if (!metar) return null;
  const match = metar.match(/\b(\d{3}|VRB)(\d{2,3})(G(\d{2,3}))?KT\b/);
  if (!match) return null;
  const direction = match[1] === "VRB" ? null : Number.parseInt(match[1], 10);
  const speed = Number.parseInt(match[2] ?? "0", 10);
  const gust = match[4] ? Number.parseInt(match[4], 10) : 0;
  if (!Number.isFinite(speed)) return null;
  return {
    direction: Number.isFinite(direction) ? direction : null,
    speed,
    gust: Number.isFinite(gust) ? gust : 0,
  };
};

const crosswindForHeadings = (wind: { direction: number | null; speed: number; gust: number }, headings: number[]) => {
  if (!wind.direction || headings.length === 0) return null;
  const speed = Math.max(wind.speed, wind.gust);
  let maxCrosswind = 0;
  for (const heading of headings) {
    const diff = Math.abs(((wind.direction - heading + 540) % 360) - 180);
    const cross = Math.abs(Math.sin((diff * Math.PI) / 180) * speed);
    if (cross > maxCrosswind) maxCrosswind = cross;
  }
  return Math.round(maxCrosswind);
};

export function MetarWorstCard({
  featured,
  initialWorst,
  labels,
  className,
  refreshIntervalMs = 60000,
}: Props) {
  const [worst, setWorst] = useState<WorstWeather | null>(initialWorst);
  const [error, setError] = useState(false);

  const refreshWorst = useCallback(async () => {
    if (!featured.length) return;
    try {
      const results = await Promise.all(
        featured.map(async (airport) => {
          const res = await fetch(`/api/airports/${airport.icao}/live`, { cache: "no-store" });
          if (!res.ok) return null;
          const data = await res.json();
          const metar = typeof data.metar === "string" ? data.metar : null;
          if (!metar || metar.toLowerCase().includes("not available")) return null;
          return {
            icao: airport.icao,
            name: airport.name,
            metar,
            windKts: parseWindKts(metar),
            visibilityMeters: parseVisibilityMeters(metar),
            rainScore: parseRainScore(metar),
          };
        }),
      );
      const ranked = results
        .filter(Boolean)
        .sort((a, b) => {
          const left = a as WorstWeather;
          const right = b as WorstWeather;
          if (right.windKts !== left.windKts) return right.windKts - left.windKts;
          if (left.visibilityMeters !== right.visibilityMeters) return left.visibilityMeters - right.visibilityMeters;
          return right.rainScore - left.rainScore;
        });
      setWorst(ranked[0] ?? null);
      setError(false);
    } catch {
      setError(true);
    }
  }, [featured]);

  useEffect(() => {
    if (!refreshIntervalMs) return undefined;
    const timer = setInterval(refreshWorst, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs, refreshWorst]);

  const runwayHeadings = useMemo(() => {
    const map = new Map<string, number[]>();
    featured.forEach((airport) => {
      map.set(airport.icao.toUpperCase(), parseRunwayHeadings(airport.runways));
    });
    return map;
  }, [featured]);

  const visibilityLabel = useMemo(
    () => (worst ? formatVisibility(worst.visibilityMeters) : null),
    [worst],
  );
  const rainLabel = useMemo(() => (worst ? parseRainLabel(worst.metar) : null), [worst]);
  const details = useMemo(() => (worst ? parseMetarDetails(worst.metar) : null), [worst]);
  const crosswindLabel = useMemo(() => {
    if (!worst) return null;
    const wind = parseWind(worst.metar);
    if (!wind) return null;
    const headings = runwayHeadings.get(worst.icao.toUpperCase()) ?? [];
    const crosswind = crosswindForHeadings(wind, headings);
    return typeof crosswind === "number" && crosswind > 0 ? `${crosswind}kt` : null;
  }, [worst, runwayHeadings]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(233,52,52,0.15),transparent_55%)]" />
      <div className="relative space-y-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{labels.title}</p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">{labels.subtitle}</p>
        </div>
        {worst ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[color:var(--text-primary)]">{worst.icao}</span>
              <span className="text-xs uppercase tracking-[0.14em] text-[color:var(--danger)]">
                Wind {worst.windKts}kt
              </span>
            </div>
            {worst.name ? <p className="text-xs text-[color:var(--text-muted)]">{worst.name}</p> : null}
            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">METAR</p>
              <p className="mt-2 break-words font-mono text-[11px] text-[color:var(--text-primary)]">
                {worst.metar}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
              {crosswindLabel ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Xwind {crosswindLabel}
                </span>
              ) : null}
              {details?.wind ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Wind {details.wind}
                </span>
              ) : null}
              {visibilityLabel ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Vis {visibilityLabel}
                </span>
              ) : null}
              {details?.temp ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Temp {details.temp}C
                </span>
              ) : null}
              {details?.dew ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Dew {details.dew}C
                </span>
              ) : null}
              {details?.qnh ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  {details.qnh}
                </span>
              ) : null}
              {rainLabel ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  {rainLabel}
                </span>
              ) : null}
              {details?.clouds?.length ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Clouds {details.clouds.join("/")}
                </span>
              ) : null}
              {details?.weatherCodes?.length ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                  Wx {details.weatherCodes.join(" ")}
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">{error ? labels.empty : labels.empty}</p>
        )}
      </div>
    </Card>
  );
}
