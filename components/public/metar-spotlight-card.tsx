"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeaturedAirport = { icao: string; name?: string | null };
type Labels = {
  title: string;
  subtitle: string;
  inputLabel: string;
  button: string;
  empty: string;
};

type Props = {
  initialIcao: string;
  initialMetar: string | null;
  featured: FeaturedAirport[];
  labels: Labels;
  className?: string;
  refreshIntervalMs?: number;
};

const parseVisibility = (metar: string | null) => {
  if (!metar) return null;
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
    const km = miles > 0 ? miles * 1.60934 : null;
    return km ? `${km.toFixed(1)} km` : null;
  }
  const metersMatch = metar.match(/\b(?!Q|A)(\d{4})\b/);
  if (!metersMatch) return null;
  const meters = Number.parseInt(metersMatch[1], 10);
  return Number.isFinite(meters) ? `${(meters / 1000).toFixed(1)} km` : null;
};

const parseRain = (metar: string | null) => {
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

export function MetarSpotlightCard({
  initialIcao,
  initialMetar,
  featured,
  labels,
  className,
  refreshIntervalMs = 60000,
}: Props) {
  const [icao, setIcao] = useState(initialIcao);
  const [metar, setMetar] = useState<string | null>(initialMetar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = useMemo(() => icao.trim().toUpperCase(), [icao]);
  const visibility = useMemo(() => parseVisibility(metar), [metar]);
  const rain = useMemo(() => parseRain(metar), [metar]);
  const details = useMemo(() => parseMetarDetails(metar), [metar]);

  const fetchMetar = useCallback(async (target: string) => {
    const sanitized = target.trim().toUpperCase();
    if (!sanitized) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/airports/${sanitized}/live`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const nextMetar = typeof data.metar === "string" ? data.metar : null;
      setMetar(nextMetar);
    } catch {
      setError(labels.empty);
      setMetar(null);
    } finally {
      setLoading(false);
    }
  }, [labels.empty]);

  useEffect(() => {
    if (!refreshIntervalMs || !normalized) return undefined;
    const timer = setInterval(() => {
      fetchMetar(normalized);
    }, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs, normalized, fetchMetar]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-[color:var(--border)] bg-[color:var(--surface)] p-5 text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(44,107,216,0.08),transparent_55%)]" />
      <div className="relative space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{labels.title}</p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">{labels.subtitle}</p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            fetchMetar(normalized);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <label className="sr-only" htmlFor="metar-icao">
            {labels.inputLabel}
          </label>
          <input
            id="metar-icao"
            value={icao}
            onChange={(event) => setIcao(event.target.value)}
            placeholder="LPPT"
            className="h-9 w-28 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-primary)] outline-none"
          />
          <Button
            type="submit"
            size="sm"
            className="border border-transparent bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-strong)]"
            disabled={loading || !normalized}
          >
            {loading ? "Loading..." : labels.button}
          </Button>
        </form>
        {featured.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {featured.map((airport) => (
              <button
                key={airport.icao}
                type="button"
                onClick={() => {
                  setIcao(airport.icao);
                  fetchMetar(airport.icao);
                }}
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
              >
                {airport.icao}
              </button>
            ))}
          </div>
        ) : null}
        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">METAR</p>
          {error ? (
            <p className="mt-2 text-xs text-[color:var(--danger)]">{error}</p>
          ) : (
            <p className="mt-2 break-words font-mono text-[11px] text-[color:var(--text-primary)]">
              {metar ?? labels.empty}
            </p>
          )}
        </div>
        {metar ? (
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            {details?.wind ? (
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                Wind {details.wind}
              </span>
            ) : null}
            {visibility ? (
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                Vis {visibility}
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
            {rain ? (
              <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1">
                {rain}
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
        ) : null}
      </div>
    </Card>
  );
}
