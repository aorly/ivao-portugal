import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { ivaoClient } from "@/lib/ivaoClient";
import { fetchMetarTaf } from "@/lib/weather";
import { ProcedureViewer } from "@/components/public/procedure-viewer";
import { LiveAirportPanels } from "@/components/public/live-airport-panels";
import { getTransitionAltitudeFt, getTransitionLevel } from "@/lib/transition-level";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { parseAirportLayout } from "@/lib/airport-layout";
import { type AirportLayoutData } from "@/components/puck/airport-context";
import { StandMap } from "@/components/map/stand-map";
import { type Data } from "@measured/puck";
import { AirportPuckRendererClient } from "@/components/puck/airport-renderer-client";

type Props = {
  params: Promise<{ locale: Locale; icao: string }>;
};

const getAirportDetail = unstable_cache(
  (icaoValue: string) =>
    prisma.airport.findUnique({
      where: { icao: icaoValue },
      include: {
        fir: {
          select: {
            slug: true,
            id: true,
            frequencies: { orderBy: { station: "asc" }, select: { id: true, station: true, frequency: true } },
          },
        },
        atcFrequencies: { orderBy: { station: "asc" }, select: { id: true, station: true, frequency: true } },
        stands: true,
        sids: { include: { waypoints: { orderBy: { order: "asc" } } } },
        stars: { include: { waypoints: { orderBy: { order: "asc" } } } },
        weatherLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
    }),
  ["public-airport-detail"],
  { revalidate: 300 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, icao: rawIcao = "" } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  if (!rawIcao) {
    return {
      title: t("detailTitle", { icao: "UNKNOWN" }),
      robots: { index: false, follow: false },
    };
  }
  const icao = rawIcao.toUpperCase();
  const airport = await getAirportDetail(icao);

  if (!airport) {
    return {
      title: t("detailTitle", { icao }),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${airport.icao} - ${airport.name}`,
    description: t("detailDescription"),
    alternates: { canonical: absoluteUrl(`/${locale}/airports/${airport.icao.toLowerCase()}`) },
  };
}

export default async function AirportDetailPage({ params }: Props) {
  const { locale, icao: rawIcao = "" } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  if (!rawIcao) {
    notFound();
  }
  const session = await auth();
  const isStaff = session?.user && session.user.role !== "USER";
  const canonicalIcao = rawIcao.toLowerCase();
  const icao = rawIcao.toUpperCase();

  if (rawIcao !== canonicalIcao) {
    redirect(`/${locale}/airports/${canonicalIcao}`);
  }

  const airport = await getAirportDetail(icao);

  if (!airport) {
    return (
      <main className="flex flex-col gap-6">
        <div className="mx-auto w-full max-w-6xl">
          <SectionHeader eyebrow={t("title")} title={icao} description="Not found" />
          <Card>
            <p className="text-sm text-[color:var(--text-muted)]">Airport not found.</p>
          </Card>
        </div>
      </main>
    );
  }

  const updatedAt = new Date(airport.updatedAt);
  const updatedLabel = Number.isNaN(updatedAt.getTime()) ? null : updatedAt.toLocaleString(locale);
  const timetableLabels = {
    choose: t("timetableChoose"),
    button: t("timetableButton"),
    inbound: t("timetableInbound"),
    outbound: t("timetableOutbound"),
    empty: t("timetableEmpty"),
    loading: t("timetableLoading"),
    error: t("timetableError"),
    updated: t("timetableUpdated"),
  };
  const puckContext: AirportLayoutData = {
    locale,
    icao,
    name: airport.name,
    labels: timetableLabels,
  };
  const puckData = parseAirportLayout(airport.puckLayout);
  const puckRenderData = puckData ? ({ ...puckData, root: puckData.root ?? {} } as Data) : null;

  const latest = airport.weatherLogs[0];
  const liveWeatherPromise = latest ? Promise.resolve(null) : fetchMetarTaf(icao).catch(() => null);
    const [liveWeather, whazzup, flightsRawFallback, atcLiveRaw] = await Promise.all([
      liveWeatherPromise,
      ivaoClient.getWhazzup(),
      ivaoClient.getFlights().catch(() => []),
      ivaoClient.getOnlineAtc().catch(() => []),
    ]);
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;
  const liveWeatherMetar =
    isRecord(liveWeather) && typeof liveWeather.metar === "string" ? liveWeather.metar : null;
  const liveWeatherTaf =
    isRecord(liveWeather) && typeof liveWeather.taf === "string" ? liveWeather.taf : null;
  const latestMetar = latest?.rawMetar ?? liveWeatherMetar ?? t("detailBody");
  const latestTaf = latest?.rawTaf ?? liveWeatherTaf ?? "-";

  const parseQnh = (metar: string | undefined | null) => {
    if (!metar) return null;
    const match = metar.match(/\bQ(\d{4})\b/);
    if (!match) return null;
    const qnh = Number(match[1]);
    return Number.isFinite(qnh) ? qnh : null;
  };
  const qnh = parseQnh(latestMetar);
  const tlInfo = qnh ? await getTransitionLevel(icao, qnh) : null;
  const taFt = (await getTransitionAltitudeFt(icao)) ?? null;

  const parseJsonArray = (value: string | null | undefined): unknown[] => {
    try {
      const parsed = JSON.parse(value ?? "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
    return [];
  };

  const runways = parseJsonArray(airport.runways);
  const charts = parseJsonArray(airport.charts);
  const sceneries = parseJsonArray(airport.scenery);
  const getLinkUrl = (value: unknown) => {
    if (typeof value === "string") return value;
    if (isRecord(value) && typeof value.url === "string") return value.url;
    return null;
  };
  const getLinkSimulator = (value: unknown) =>
    isRecord(value) && typeof value.simulator === "string" ? value.simulator : null;
  const runwayHolding = (r: unknown) => {
    if (!r || typeof r !== "object" || !("holdingPoints" in r)) return [];
    const hp = (r as { holdingPoints?: unknown }).holdingPoints;
    if (!Array.isArray(hp)) return [];
    type HoldingPoint = { name: string; length: number | null; preferred: boolean };
    return hp
      .map((h) => {
        if (!h) return null;
        if (typeof h === "object" && "name" in h) {
          const rawLength = (h as { length?: unknown }).length;
          const length = typeof rawLength === "number" && Number.isFinite(rawLength) ? rawLength : null;
          return {
            name: String((h as { name: unknown }).name ?? ""),
            length,
            preferred: Boolean((h as { preferred?: unknown }).preferred),
          };
        }
        return { name: String(h), length: null, preferred: false };
      })
      .filter((h): h is HoldingPoint => Boolean(h && h.name));
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const whazzupRecord = isRecord(whazzup) ? whazzup : null;
  const whazzupClients = whazzupRecord && isRecord(whazzupRecord.clients) ? whazzupRecord.clients : null;
  const planesRaw = whazzupClients?.pilots ?? whazzupRecord?.pilots ?? (Array.isArray(whazzup) ? whazzup : []);
  const parseCoord = (val: unknown) => {
    if (val == null) return NaN;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(",", ".");
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? num : NaN;
    }
    return NaN;
  };

  const getNested = (value: unknown, path: string[]) => {
    let current: unknown = value;
    for (const key of path) {
      if (!isRecord(current)) return undefined;
      current = current[key];
    }
    return current;
  };

  type Plane = {
    lat: number;
    lon: number;
    gs: number;
    dep: string;
    arr: string;
    callsign: string;
    aircraft: string;
    state?: string;
  };

  const getFlightState = (flight: Record<string, unknown>): string | undefined => {
    const base = flight.state ?? flight.status ?? flight.phase ?? flight.flightPhase;
    const lastTrack = isRecord(flight.lastTrack) ? flight.lastTrack : null;
    const trackState = lastTrack?.state ?? lastTrack?.phase ?? lastTrack?.groundState;
    const stateCandidate = base ?? trackState;
    const cleaned = typeof stateCandidate === "string" ? stateCandidate.trim() : undefined;
    if (cleaned) return cleaned;

    const onGround = typeof lastTrack?.onGround === "boolean" ? lastTrack.onGround : undefined;
    const groundSpeed =
      typeof lastTrack?.groundSpeed === "number"
        ? lastTrack.groundSpeed
        : typeof flight.groundSpeed === "number"
          ? flight.groundSpeed
          : undefined;

    if (onGround) {
      if (groundSpeed && groundSpeed > 10) return "Taxi";
      return "On Stand";
    }

    return "En Route";
  };

  const parseWind = (metar: string | undefined | null) => {
    if (!metar) return null;
    const match = metar.match(/\b(\d{3}|VRB)(\d{2,3})(G\d{2,3})?KT\b/);
    if (!match) return null;
    const dir = match[1] === "VRB" ? null : Number(match[1]);
    const speed = Number(match[2]);
    return { direction: Number.isFinite(dir) ? dir : null, speed: Number.isFinite(speed) ? speed : null };
  };

  const runwayHeading = (r: Record<string, unknown>) => {
    const directHeading = typeof r.heading === "number" ? r.heading : Number(r.heading);
    const derivedHeading = (() => {
      const id = typeof r.id === "string" ? r.id : "";
      const first = id.split(/[\\/]/)[0] ?? "";
      const num = parseInt(first.replace(/\D/g, ""), 10);
      return Number.isFinite(num) ? num * 10 : null;
    })();
    const rawHeading = Number.isFinite(directHeading) ? directHeading : derivedHeading;
    if (typeof rawHeading !== "number" || !Number.isFinite(rawHeading)) return null;
    const normalized = ((rawHeading % 360) + 360) % 360;
    return normalized === 0 ? 360 : normalized;
  };

  const wind = parseWind(latestMetar);
  const favoriteRunwayId = (() => {
    if (!wind?.direction && wind?.direction !== 0) return null;
    let best: { id: string; headwind: number } | null = null;
    for (const r of runways) {
      if (!isRecord(r)) continue;
      const heading = runwayHeading(r);
      if (!heading) continue;
      const runwayId = typeof r.id === "string" ? r.id : "Rwy";
      const diff = Math.abs(((wind.direction! - heading + 540) % 360) - 180);
      const headwind = Math.cos((diff * Math.PI) / 180) * (wind.speed ?? 1);
      if (!best || headwind > best.headwind) best = { id: runwayId, headwind };
    }
    return best?.id ?? null;
  })();
    const isFavoriteRunway = (id: string | null | undefined) => favoriteRunwayId && id === favoriteRunwayId;

    const runwaysSummary = runways
      .filter(isRecord)
      .map((r) => {
        const id = typeof r.id === "string" ? r.id : "Rwy";
        const heading = runwayHeading(r);
        const length = typeof r.length === "number" && Number.isFinite(r.length) ? r.length : null;
        return { id, heading, length };
      });
    const favoriteRunway = runwaysSummary.find((r) => r.id === favoriteRunwayId) ?? null;

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

  const planesParsed = (data: unknown[]) =>
    data
      .filter(isRecord)
      .map((p): Plane => ({
        lat: parseCoord(
          getNested(p, ["lastTrack", "latitude"]) ??
            getNested(p, ["location", "latitude"]) ??
            getNested(p, ["location", "lat"]) ??
            getNested(p, ["position", "latitude"]) ??
            getNested(p, ["position", "lat"]) ??
            p.latitude ??
            p.lat ??
            p.latitud,
        ),
        lon: parseCoord(
          getNested(p, ["lastTrack", "longitude"]) ??
            getNested(p, ["location", "longitude"]) ??
            getNested(p, ["location", "lon"]) ??
            getNested(p, ["position", "longitude"]) ??
            getNested(p, ["position", "lon"]) ??
            p.longitude ??
            p.lon ??
            p.longitud,
        ),
        gs: parseCoord(
          getNested(p, ["lastTrack", "groundSpeed"]) ??
            p.groundSpeed ??
            p.ground_speed ??
            p.groundspeed ??
            p.gs ??
            p.speed ??
            p.velocity,
        ),
        dep: String(
          getNested(p, ["flightPlan", "departureId"]) ??
            getNested(p, ["flight_plan", "departureId"]) ??
            p.departure ??
            p.dep ??
            p.origin ??
            "",
        ).toUpperCase(),
        arr: String(
          getNested(p, ["flightPlan", "arrivalId"]) ??
            getNested(p, ["flight_plan", "arrivalId"]) ??
            p.arrival ??
            p.dest ??
            p.destination ??
            "",
        ).toUpperCase(),
        callsign: String(p.callsign ?? "").toUpperCase(),
        aircraft: String(
          getNested(p, ["flightPlan", "aircraftId"]) ??
            getNested(p, ["flight_plan", "aircraftId"]) ??
            p.aircraftType ??
            p.aircraft ??
            "",
        ),
        state: getFlightState(p),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  const planesWhazzup = Array.isArray(planesRaw) ? planesParsed(planesRaw) : [];
  const planesFlights = Array.isArray(flightsRawFallback) ? planesParsed(flightsRawFallback) : [];
  const planes = planesWhazzup.length > 0 ? planesWhazzup : planesFlights;
  const planesWithCoords = planes.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const inbound = planes.filter((p) => p.arr === icao);
  const outbound = planes.filter((p) => p.dep === icao);
  const hasTrafficData = planes.length > 0;

  const standWithOccupancy =
    airport.stands.map((stand) => {
      const distances = planesWithCoords.map((p) => haversineMeters(stand.lat, stand.lon, p.lat, p.lon));
      const min = distances.length ? Math.min(...distances) : Infinity;
      const byPosition = min < 40; // threshold ~40 m
      const nearest = planesWithCoords.length
        ? planesWithCoords.reduce(
            (best, p) => {
              const d = haversineMeters(stand.lat, stand.lon, p.lat, p.lon);
              return d < best.dist ? { dist: d, plane: p } : best;
            },
            { dist: Infinity, plane: null as Plane | null },
          )
        : { dist: Infinity, plane: null as Plane | null };
      return {
        ...stand,
        occupied: planesWithCoords.length > 0 && byPosition,
        occupant: planesWithCoords.length > 0 && byPosition ? nearest.plane : null,
      };
    }) ?? [];
  const occupiedStands = standWithOccupancy.filter((s) => s.occupied);

  const center = (() => {
    if (standWithOccupancy.length === 0) return null;
    const lat = standWithOccupancy.reduce((sum, s) => sum + s.lat, 0) / standWithOccupancy.length;
    const lon = standWithOccupancy.reduce((sum, s) => sum + s.lon, 0) / standWithOccupancy.length;
    return { lat, lon };
  })();

  const clientsObj: Record<string, unknown> = whazzupClients ?? {};
    const candidateValues: unknown[] = [
      atcLiveRaw,
      clientsObj.atc,
      clientsObj.controllers,
      clientsObj.controlers,
      whazzupRecord?.atc,
    whazzupRecord?.controllers,
    whazzupRecord?.controlers,
    Array.isArray(whazzup) ? whazzup : null,
    ...Object.values(clientsObj ?? {}),
  ];
  const candidateArrays = candidateValues.filter(Array.isArray) as unknown[][];
  const atcRaw = candidateArrays.flat().filter(isRecord);
  type AtcInfo = { callsign: string; frequency: string; distance: number | null };
  const onlineAtc = atcRaw
    .map((c): AtcInfo | null => {
      const lat = parseCoord(
        getNested(c, ["location", "latitude"]) ??
          getNested(c, ["location", "lat"]) ??
          getNested(c, ["position", "latitude"]) ??
          getNested(c, ["position", "lat"]) ??
          c.latitude ??
          c.lat,
      );
      const lon = parseCoord(
        getNested(c, ["location", "longitude"]) ??
          getNested(c, ["location", "lon"]) ??
          getNested(c, ["position", "longitude"]) ??
          getNested(c, ["position", "lon"]) ??
          c.longitude ??
          c.lon,
      );
      const callsign = String(c.callsign ?? c.station ?? "").toUpperCase();
      const matchesCallsign = callsign.includes(icao);
      const hasPos = Number.isFinite(lat) && Number.isFinite(lon) && center;
      const distance = hasPos ? haversineMeters(center!.lat, center!.lon, lat, lon) : null;
      const closeEnough = hasPos && distance !== null ? distance <= 18520 : false; // ~10nm

      if (!matchesCallsign && !closeEnough) return null;
        const frequency = String(c.frequency ?? c.freq ?? "").trim();
        if (!frequency) return null;
        return {
          callsign: String(c.callsign ?? c.station ?? "ATC"),
          frequency,
          distance,
        };
    })
    .filter((value): value is AtcInfo => Boolean(value))
    .sort((a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY));

  const allFrequencies = [
    ...airport.atcFrequencies,
    ...(airport.fir?.frequencies ?? []),
  ];

  const stationForType = (type: string) => {
    const suffix = `_${type.toUpperCase()}`;
    const onlineMatch = onlineAtc.find((atc) => atc.callsign.toUpperCase().endsWith(suffix));
    if (onlineMatch?.frequency) {
      return { frequency: onlineMatch.frequency, live: true };
    }
    const defaultStation = `${icao}${suffix}`;
    const exact = allFrequencies.find((f) => f.station.toUpperCase() === defaultStation);
    const fallback = allFrequencies.find((f) => f.station.toUpperCase().endsWith(suffix));
    const chosen = exact ?? fallback;
    return chosen ? { frequency: chosen.frequency, live: false } : null;
  };

  const topFrequencies = [
    { label: "CTR", data: stationForType("CTR") },
    { label: "APP", data: stationForType("APP") },
    { label: "TWR", data: stationForType("TWR") },
    { label: "GND", data: stationForType("GND") },
    { label: "DEL", data: stationForType("DEL") },
  ].filter((item) => item.data);

  const atcBadge =
    onlineAtc.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-[color:var(--danger)]/15 px-3 py-1 text-xs font-semibold text-[color:var(--danger)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--danger)]" />
        <span>ATC Online</span>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {onlineAtc.map((atc) => (
            <span key={`${atc.callsign}-${atc.frequency}`} className="rounded bg-[color:var(--surface-2)] px-2 py-0.5 text-[color:var(--danger)]">
              {atc.callsign}
            </span>
          ))}
        </div>
      </div>
    ) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: `${airport.icao} ${airport.name}`,
    icaoCode: airport.icao,
    iataCode: airport.iata ?? undefined,
    url: absoluteUrl(`/${locale}/airports/${airport.icao.toLowerCase()}`),
    geo: {
      "@type": "GeoCoordinates",
      latitude: airport.latitude,
      longitude: airport.longitude,
    },
  };

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SectionHeader
          eyebrow={airport.fir?.slug ?? "FIR"}
          title={t("detailTitle", { icao })}
          description={airport.name}
          action={atcBadge}
        />
        {isStaff || updatedLabel ? (
          <div className="hidden flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            {isStaff ? <Badge>Published</Badge> : null}
            {updatedLabel ? <span>Last updated {updatedLabel}</span> : null}
          </div>
        ) : null}

        {topFrequencies.length ? (
          <div className="my-6 grid grid-cols-5 gap-2 rounded-2xl bg-[color:var(--surface)] p-4 text-center">
            {topFrequencies.map((slot) => (
              <div key={slot.label} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                  {slot.label}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {slot.data?.live ? (
                    <span className="flex h-2 w-2 rounded-full bg-[color:var(--primary)] shadow-[0_0_10px_rgba(59,130,246,0.7)]" />
                  ) : null}
                  <p
                    className={`text-lg font-semibold ${
                      slot.data?.live ? "text-[color:var(--primary)]" : "text-[color:var(--text-primary)]"
                    }`}
                  >
                    {slot.data?.frequency ?? "-"}
                  </p>
                  {slot.data?.live ? (
                    <span className="rounded-full border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--primary)]">
                      Live
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

          {puckRenderData ? (
            <div className="w-full">
              <AirportPuckRendererClient data={puckRenderData} context={puckContext} />
            </div>
          ) : null}

        <div className="columns-1 md:columns-2 gap-4 space-y-4">
            <LiveAirportPanels
              icao={icao}
              initialMetar={latestMetar}
              initialTaf={latestTaf}
              initialStands={standWithOccupancy}
              initialInbound={inbound}
              initialOutbound={outbound}
              hasTrafficData={hasTrafficData}
              initialAtc={onlineAtc}
              runways={runwaysSummary}
              wind={wind}
              favoriteRunway={favoriteRunway}
            />
          <Card className="space-y-2 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Transition data</p>
          <p className="text-xs text-[color:var(--text-muted)]">
            {qnh ? `QNH ${qnh} hPa` : "QNH not available from METAR"}
          </p>
          <div className="text-sm text-[color:var(--text-primary)]">
            <p>{taFt ? `TA ${taFt} ft` : "TA not set for this aerodrome"}</p>
            <p>{tlInfo ? `TL FL${tlInfo.tl}` : qnh ? "TL unavailable for this QNH" : ""}</p>
          </div>
        </Card>

        <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Runways</p>
          {runways.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No runway data published yet.</p>
          ) : (
            <div className="space-y-2">
              {runways.map((r) => {
                const rid = isRecord(r) && typeof r.id === "string" ? r.id : "Rwy";
                const fav = isFavoriteRunway(rid);
                const heading = isRecord(r) && typeof r.heading !== "undefined" ? String(r.heading) : null;
                const length = isRecord(r) && typeof r.length !== "undefined" ? r.length : null;
                return (
                  <div
                    key={rid}
                    className={`rounded-lg border p-3 text-sm ${
                      fav ? "border-[#22c55e] bg-[#22c55e]/10" : "border-[color:var(--border)] bg-[color:var(--surface-2)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[color:var(--text-primary)]">
                        {rid} {heading ? `(${heading})` : ""}
                      </p>
                      {fav ? (
                        <div className="ml-auto relative inline-flex group">
                          <button
                            type="button"
                            aria-label="Wind favored info"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#16a34a] bg-[#22c55e]/20 text-xs font-bold text-[#166534]"
                          >
                            ?
                          </button>
                          <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden min-w-[220px] rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-[11px] text-[color:var(--text-primary)] shadow-lg group-hover:block group-focus-within:block">
                            Favored by current METAR wind. Other factors like visibility, runway capabilities, and traffic sequencing can change the preferred runway.
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {length ? (
                      <p className="text-xs text-[color:var(--text-muted)]">Length: {String(length)}</p>
                    ) : null}
                    {runwayHolding(r).length ? (
                      <div className="mt-1 space-y-1 text-xs text-[color:var(--text-muted)]">
                        <p className={`font-semibold ${fav ? "text-[#064e3b]" : "text-[color:var(--text-primary)]"}`}>Holding points</p>
                        <div className="flex flex-wrap gap-1">
                          {runwayHolding(r).map((hp) => (
                            <span
                              key={hp.name}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${
                                hp.preferred
                                  ? "bg-[#d1fae5]/30 text-[#059669] border border-[#10b981] text-opacity-100"
                                  : "bg-[color:var(--surface-3)] text-[color:var(--text-primary)] border border-[color:var(--border)]"
                              }`}
                            >
                              {hp.name}
                              {hp.length ? <span className="text-[10px] text-[color:var(--text-muted)]">({hp.length})</span> : null}
                              {hp.preferred ? <span className="text-[10px] font-bold">Preferred</span> : null}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        
        {false && (
        <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Stands</p>
          {standWithOccupancy.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No stands published yet.</p>
          ) : (
            <>
              <div className="rounded-2xl bg-[color:var(--surface-2)] p-3 space-y-2">
                <div className="flex items-center gap-3 text-xs text-[color:var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#34d399]" /> Free
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full bg-[#facc15]" /> Occupied
                  </span>
                  {!hasTrafficData ? (
                    <span className="text-[color:var(--text-muted)]">Live occupancy unavailable.</span>
                  ) : null}
                </div>
                <StandMap stands={standWithOccupancy} />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {occupiedStands.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)]">No occupied stands detected right now.</p>
                ) : (
                  occupiedStands.map((stand) => (
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
        )}

        <Card className="space-y-2 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Charts</p>
          {charts.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No charts published yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {charts.map((item, idx) => {
                const url = getLinkUrl(item);
                if (!url) return null;
                return (
                  <li key={idx}>
                    <a href={url} target="_blank" className="text-[color:var(--primary)] underline" rel="noreferrer">
                      {url}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-2 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Sceneries</p>
          {sceneries.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No sceneries published yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {sceneries.map((item, idx) => {
                const url = getLinkUrl(item);
                if (!url) return null;
                const simulator = getLinkSimulator(item);
                return (
                  <li key={idx}>
                    <a href={url} target="_blank" className="text-[color:var(--primary)] underline" rel="noreferrer">
                      {url}
                    </a>
                    {simulator ? <span className="ml-2 text-xs text-[color:var(--text-muted)]">({simulator})</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Procedures</p>
          <ProcedureViewer
            procedures={[
              ...airport.sids.map((sid) => ({
                id: sid.id,
                name: sid.name,
                runway: sid.runway || "Unknown",
                type: "SID" as const,
                waypoints: sid.waypoints ?? [],
              })),
              ...airport.stars.map((star) => ({
                id: star.id,
                name: star.name,
                runway: star.runway || "Unknown",
                type: "STAR" as const,
                waypoints: star.waypoints ?? [],
              })),
            ]}
          />
        </Card>

        {false && (
        <Card className="space-y-3 p-4" style={{ breakInside: "avoid" }}>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Traffic</p>
          <div className="grid gap-3 md:grid-cols-2 text-xs">
            <div className="space-y-1">
              <p className="text-[color:var(--text-muted)] font-semibold">Inbound</p>
            {inbound.length === 0 ? (
              <p className="text-[color:var(--text-muted)]">No inbound traffic right now.</p>
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
              <p className="text-[color:var(--text-muted)]">No outbound traffic right now.</p>
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
        )}
      </div>

        {airport.fir ? (
          <Link href={`/${locale}/fir/${airport.fir.slug}`}>
            <Button variant="secondary" size="sm">
              {airport.fir.slug}
            </Button>
          </Link>
        ) : null}
      </div>
    </main>
  );
}
