import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { AirportTimetable } from "@/components/public/airport-timetable";
import { BookStationModal } from "@/components/public/book-station-modal";
import { CreatorsCarousel } from "@/components/public/creators-carousel";
import { AirlinesCarousel } from "@/components/public/airlines-carousel";
import { getCreatorPlatformStatus } from "@/lib/creator-platforms";
import { createAtcBookingAction } from "./actions";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { syncCalendarIfStale } from "@/lib/calendar-sync";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: absoluteUrl(`/${locale}/home`) },
  };
}

const portugalMainlandPaths = [
  "M18.53,29.91 L17.92,30.45 L18.53,29.91 Z",
  "M11.47,63.20 L12.40,62.07 L11.47,63.20 Z",
  "M12.93,61.33 L12.68,61.96 L12.93,61.33 Z",
  "M12.91,61.99 L12.48,62.47 L13.16,62.33 L12.91,61.99 Z",
  "M18.60,29.66 L17.96,30.14 L18.60,29.66 Z",
  "M33.74,95.29 L32.90,96.00 L33.74,95.29 Z",
  "M31.19,95.34 L32.89,95.98 L31.19,95.34 Z",
  "M33.94,94.88 L33.11,95.31 L33.94,94.88 Z",
  "M25.14,94.01 L28.47,93.94 L31.16,95.53 L30.22,94.86 L32.64,95.67 L32.66,95.13 L34.26,94.68 L34.24,95.07 L38.37,92.65 L41.22,92.44 L40.09,86.70 L39.05,85.54 L39.38,84.62 L40.45,83.56 L40.84,81.89 L43.29,79.94 L43.66,77.97 L46.17,77.54 L46.56,76.84 L48.27,77.22 L48.86,74.67 L49.52,73.93 L46.80,74.62 L43.35,70.18 L42.36,69.89 L43.99,66.56 L43.48,66.30 L43.71,64.78 L47.61,62.29 L47.39,61.54 L49.18,59.48 L49.03,58.93 L47.81,57.85 L45.76,57.97 L45.92,56.86 L44.03,56.20 L44.21,54.96 L42.59,53.14 L43.10,51.80 L41.54,51.19 L38.71,48.13 L42.40,48.54 L48.04,48.02 L48.54,45.54 L50.02,44.46 L50.72,41.95 L49.36,40.18 L48.08,39.94 L47.78,38.87 L48.34,38.01 L50.65,37.49 L52.19,35.72 L50.97,34.17 L51.94,33.11 L51.84,32.42 L51.05,32.15 L51.96,30.46 L51.30,28.84 L51.82,26.92 L49.53,23.93 L51.70,23.81 L52.67,22.61 L52.42,22.07 L54.54,20.07 L57.24,19.74 L59.35,18.09 L59.13,17.64 L60.40,17.62 L60.12,17.18 L62.68,14.27 L60.67,12.73 L58.16,12.32 L57.18,12.81 L56.31,12.31 L55.95,11.28 L56.90,9.01 L55.91,8.80 L56.35,7.81 L55.61,7.31 L53.63,7.92 L51.65,6.87 L51.47,7.69 L50.22,7.80 L48.68,7.20 L47.10,7.64 L45.80,6.90 L45.02,7.23 L44.82,8.86 L41.83,9.34 L40.73,10.15 L40.29,9.12 L37.48,9.76 L37.93,8.83 L35.89,8.37 L33.33,8.84 L32.84,9.48 L32.25,8.03 L31.99,8.90 L28.27,10.12 L27.67,9.96 L27.59,8.92 L27.05,8.97 L26.75,8.27 L27.70,7.04 L29.07,6.44 L29.09,5.90 L28.44,5.27 L27.36,5.58 L27.07,4.00 L24.71,5.25 L19.32,5.89 L18.86,6.69 L15.11,9.04 L14.99,11.17 L15.62,12.52 L15.89,12.22 L16.86,16.07 L16.65,17.10 L19.17,24.11 L17.06,30.77 L17.85,30.19 L18.97,26.92 L18.73,27.97 L19.18,27.28 L19.50,27.75 L18.51,28.34 L18.57,29.04 L19.77,29.30 L18.68,29.58 L19.00,29.88 L18.20,30.53 L18.64,30.83 L17.15,30.80 L14.47,38.85 L15.28,39.59 L15.22,40.27 L11.97,47.14 L11.59,49.55 L8.83,52.17 L9.61,52.78 L8.86,53.06 L9.11,52.68 L8.59,52.35 L5.61,53.52 L6.40,53.72 L6.85,55.90 L5.39,58.57 L5.60,60.99 L4.00,63.78 L4.71,65.30 L7.13,65.69 L10.59,65.06 L12.95,60.93 L13.06,62.55 L14.18,64.16 L12.05,64.98 L12.00,65.39 L13.41,65.21 L12.69,65.52 L12.96,66.08 L11.84,65.50 L11.24,65.93 L11.97,66.91 L11.40,66.19 L10.99,66.62 L10.41,66.25 L11.09,66.12 L10.28,65.42 L8.21,65.87 L9.65,68.48 L10.32,68.36 L9.65,68.66 L8.92,70.28 L12.36,69.72 L14.67,68.40 L16.77,69.25 L17.22,68.72 L16.21,68.59 L17.66,67.46 L17.48,68.35 L18.03,68.45 L17.58,69.23 L18.68,70.19 L16.88,70.34 L16.35,69.76 L16.43,70.72 L15.97,69.73 L14.52,68.90 L16.03,70.24 L16.79,72.32 L16.51,75.38 L14.82,78.51 L16.42,79.31 L16.19,82.07 L16.66,82.68 L16.07,84.72 L16.67,85.92 L16.26,88.00 L15.03,89.66 L15.34,90.58 L12.92,94.94 L13.79,95.45 L15.70,94.27 L18.76,93.94 L20.14,92.68 L19.63,93.24 L25.14,94.01 Z",
];

const portugalMainlandBounds = { minX: 4.00, minY: 4.00, maxX: 62.68, maxY: 96.00 };
const mainlandProjection = {
  minLon: -9.5005,
  maxLon: -6.1891,
  minLat: 36.9626,
  maxLat: 42.1543,
  pad: 4,
  scale: 17.720592484157,
};

const portugalAzoresPaths = [
  "M6.51,4.69 L6.67,4.11 L6.17,4.00 L6.15,4.80 L6.51,4.69 Z",
  "M52.40,13.75 L51.64,13.23 L51.00,13.68 L51.55,14.33 L52.81,14.47 L52.40,13.75 Z",
  "M4.52,9.20 L5.47,9.12 L6.12,7.99 L4.87,6.96 L4.00,8.03 L4.52,9.20 Z",
  "M42.87,21.56 L43.27,20.64 L41.97,19.97 L39.79,20.51 L40.88,21.10 L40.99,21.70 L42.87,21.56 Z",
  "M50.21,23.40 L51.65,23.26 L46.33,21.16 L44.17,21.58 L44.46,22.72 L45.52,23.19 L48.06,23.31 L48.54,23.75 L50.21,23.40 Z",
  "M54.84,20.88 L47.40,18.25 L48.80,19.37 L51.71,20.53 L54.58,21.52 L55.71,21.32 L54.84,20.88 Z",
  "M63.58,19.76 L65.65,19.91 L66.14,18.54 L65.28,17.82 L63.84,17.60 L61.23,18.09 L61.61,19.27 L63.58,19.76 Z",
  "M89.77,33.60 L93.72,33.18 L94.23,31.98 L93.66,31.48 L91.56,31.35 L90.26,31.94 L89.02,31.63 L87.62,32.13 L86.22,31.79 L84.72,30.71 L83.64,31.44 L85.98,33.29 L87.12,33.06 L88.72,33.71 L89.77,33.60 Z",
  "M95.55,44.34 L94.90,43.84 L93.49,44.32 L93.90,44.99 L96.00,45.15 L95.55,44.34 Z",
];

const portugalAzoresBounds = { minX: 4.00, minY: 4.00, maxX: 96.00, maxY: 45.15 };
const azoresProjection = {
  minLon: -31.2682,
  maxLon: -25.0151,
  minLat: 36.9282,
  maxLat: 39.7248,
  pad: 4,
  scale: 14.71270249956,
};

const portugalMadeiraPaths = [
  "M78.87,68.40 L77.25,63.84 L78.87,68.40 Z",
  "M87.53,11.24 L87.60,13.51 L87.53,11.24 Z",
  "M95.12,4.00 L88.69,5.33 L86.54,10.09 L96.00,7.47 L95.12,4.00 Z",
  "M38.52,28.82 L24.25,31.30 L10.69,25.42 L4.00,30.67 L11.01,39.23 L34.18,47.88 L45.07,47.19 L53.12,38.27 L59.44,37.88 L45.98,35.15 L38.52,28.82 Z",
  "M74.37,55.63 L72.59,53.57 L77.19,62.71 L74.37,55.63 Z",
];

const portugalMadeiraBounds = { minX: 4.00, minY: 4.00, maxX: 96.00, maxY: 68.40 };
const madeiraProjection = {
  minLon: -17.2658,
  maxLon: -16.2925,
  minLat: 32.4158,
  maxLat: 33.0971,
  pad: 4,
  scale: 94.523785061132,
};
const mapTargets = {
  mainland: { x: 50, y: 4, width: 46, height: 92 },
  azores: { x: 4, y: 16, width: 42, height: 24 },
  madeira: { x: 6, y: 70, width: 30, height: 20 },
};
const insetRectPadding = 2;
const azoresInsetRect = {
  x: mapTargets.azores.x - insetRectPadding,
  y: mapTargets.azores.y - insetRectPadding,
  width: mapTargets.azores.width + insetRectPadding * 2,
  height: mapTargets.azores.height + insetRectPadding * 2,
};
const madeiraInsetRect = {
  x: mapTargets.madeira.x - insetRectPadding,
  y: mapTargets.madeira.y - insetRectPadding,
  width: mapTargets.madeira.width + insetRectPadding * 2,
  height: mapTargets.madeira.height + insetRectPadding * 2,
};

const projectToMap = (
  lon: number,
  lat: number,
  projection: { minLon: number; maxLon: number; minLat: number; maxLat: number; pad: number; scale: number },
) => ({
  x: (lon - projection.minLon) * projection.scale + projection.pad,
  y: (projection.maxLat - lat) * projection.scale + projection.pad,
});

const fitBounds = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  target: { x: number; y: number; width: number; height: number },
  scaleMultiplier = 1,
) => {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const scale = Math.min(target.width / width, target.height / height) * scaleMultiplier;
  const fittedWidth = width * scale;
  const fittedHeight = height * scale;
  return {
    scale,
    translate: {
      x: target.x - bounds.minX * scale + (target.width - fittedWidth) / 2,
      y: target.y - bounds.minY * scale + (target.height - fittedHeight) / 2,
    },
  };
};

const mapTransforms = {
  mainland: fitBounds(portugalMainlandBounds, mapTargets.mainland, 1.15),
  azores: fitBounds(portugalAzoresBounds, mapTargets.azores, 1.0),
  madeira: fitBounds(portugalMadeiraBounds, mapTargets.madeira, 1.0),
};
const applyTransform = (
  point: { x: number; y: number },
  transform: { scale: number; translate: { x: number; y: number } },
) => ({
  x: point.x * transform.scale + transform.translate.x,
  y: point.y * transform.scale + transform.translate.y,
});

const svgTransform = (transform: { scale: number; translate: { x: number; y: number } }) =>
  `translate(${transform.translate.x} ${transform.translate.y}) scale(${transform.scale})`;

const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data: unknown[] }).data;
  if (value && Array.isArray((value as { result?: unknown[] }).result)) return (value as { result: unknown[] }).result;
  if (value && Array.isArray((value as { items?: unknown[] }).items)) return (value as { items: unknown[] }).items;
  return [];
};

const extractIcao = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return trimmed || undefined;
  }

  if (typeof value === "object") {
    const candidate =
      (value as { icao?: string }).icao ??
      (value as { id?: string }).id ??
      (value as { code?: string }).code ??
      (value as { airport?: string }).airport ??
      (value as { station?: string }).station;

    if (candidate && candidate.trim()) {
      return candidate.trim().toUpperCase();
    }
  }

  return undefined;
};

const extractUserId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "object") {
    const candidate =
      (value as { userId?: unknown }).userId ??
      (value as { user_id?: unknown }).user_id ??
      (value as { vid?: unknown }).vid ??
      (value as { id?: unknown }).id ??
      (value as { user?: { id?: unknown } }).user?.id;
    return extractUserId(candidate);
  }
  return undefined;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const tAirports = await getTranslations({ locale, namespace: "airports" });
  const session = await auth();
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/home`)}`;
  const now = new Date();

  await syncCalendarIfStale();

  const fetchHomeData = unstable_cache(
    async () => {
      const nowForQuery = new Date();
      return Promise.all([
        prisma.event.findMany({
          where: { isPublished: true },
          orderBy: { startTime: "asc" },
          include: {
            airports: { select: { icao: true } },
            firs: { select: { slug: true } },
          },
        }),
        prisma.calendarEvent.findMany({
          where: { startTime: { gte: nowForQuery }, type: { in: ["TRAINING", "EXAM"] } },
          orderBy: { startTime: "asc" },
          take: 6,
        }),
        prisma.airport.findMany({
          select: { icao: true, name: true, latitude: true, longitude: true, updatedAt: true, fir: { select: { slug: true } } },
        }),
        prisma.fir.findMany({
          include: {
            airports: { select: { id: true } },
            events: { where: { isPublished: true }, select: { id: true } },
          },
          orderBy: { name: "asc" },
        }),
        prisma.user.count(),
      ]);
    },
    ["public-home-data"],
    { revalidate: 120 },
  );

  const [
    events,
    calendarEvents,
    airports,
    firs,
    userCount,
  ] = await fetchHomeData();

  const airlines = await prisma.airline.findMany({
    where: {
      OR: [{ countryId: "PT" }, { countryId: "pt" }],
    },
    select: { icao: true, name: true, logoUrl: true, logoDarkUrl: true },
    orderBy: { name: "asc" },
    take: 12,
  });

  const featuredAirports = [...airports]
    .sort((a, b) => {
      const aTime = toDateOrNull(a.updatedAt)?.getTime() ?? 0;
      const bTime = toDateOrNull(b.updatedAt)?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, 3)
    .map((airport) => ({ icao: airport.icao, name: airport.name, fir: airport.fir }));

  const airportsCount = airports.length;
  const airportIcaos = new Set(airports.map((airport) => airport.icao.toUpperCase()));
  const airportCoordinates = new Map(
    airports.map((airport) => [airport.icao.toUpperCase(), { lat: airport.latitude, lon: airport.longitude }]),
  );
  const isInBounds = (
    lon: number,
    lat: number,
    bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  ) => lon >= bounds.minLon && lon <= bounds.maxLon && lat >= bounds.minLat && lat <= bounds.maxLat;
  const resolveRegion = (lon: number, lat: number) => {
    if (isInBounds(lon, lat, azoresProjection)) return "azores";
    if (isInBounds(lon, lat, madeiraProjection)) return "madeira";
    if (isInBounds(lon, lat, mainlandProjection)) return "mainland";
    return null;
  };

  const fetchIvaoData = unstable_cache(
    async () => {
      const timeoutMs = 3500;
      return Promise.allSettled([
        withTimeout(ivaoClient.getWhazzup(), timeoutMs, null),
        withTimeout(ivaoClient.getFlights(), timeoutMs, []),
        withTimeout(ivaoClient.getOnlineAtc(), timeoutMs, []),
        withTimeout(ivaoClient.getAtcBookings(new Date().toISOString().slice(0, 10)), timeoutMs, []),
      ]);
    },
    ["public-home-ivao"],
    { revalidate: 60 },
  );

  const [whazzupResult, flightsResult, atcResult, bookingsResult] = await fetchIvaoData();

  const fetchCreators = unstable_cache(
    async () => ivaoClient.getCreators("pt"),
    ["public-creators"],
    { revalidate: 900 },
  );
  const creatorsRaw = await fetchCreators();
  const creatorsArray = asArray(creatorsRaw);
  const creatorsBase = creatorsArray
    .map((item) => {
      const creator = item as {
        userId?: number | string;
        tier?: number;
        user?: { id?: number | string; firstName?: string; lastName?: string };
        links?: unknown;
      };
      const user = creator.user ?? {};
      const firstName = user.firstName ?? "";
      const lastName = user.lastName ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      const links = asArray(creator.links)
        .map((link) => {
          const entry = link as { type?: string; url?: string };
          const type = (entry.type ?? "").trim().toLowerCase();
          const url = (entry.url ?? "").trim();
          if (!type || !url) return null;
          return { type, url };
        })
        .filter(Boolean) as { type: string; url: string }[];
      const vid = String(creator.userId ?? user.id ?? "");
      if (!vid || !name || links.length === 0) return null;
      return { id: vid, vid, name, tier: creator.tier ?? null, links };
    })
    .filter(Boolean) as { id: string; vid: string; name: string; tier: number | null; links: { type: string; url: string }[] }[];

  const whazzup = whazzupResult.status === "fulfilled" ? whazzupResult.value : null;
  const whazzupPilots = asArray((whazzup as { clients?: { pilots?: unknown } })?.clients?.pilots);
  const whazzupAtc = asArray(
    (whazzup as { clients?: { atc?: unknown; atcs?: unknown; controllers?: unknown } })?.clients?.atc ??
      (whazzup as { clients?: { atcs?: unknown; controllers?: unknown } })?.clients?.atcs ??
      (whazzup as { clients?: { controllers?: unknown } })?.clients?.controllers,
  );

  const flights =
    whazzupPilots.length > 0
      ? whazzupPilots
      : asArray(flightsResult.status === "fulfilled" ? flightsResult.value : []);
  const onlineAtc =
    whazzupAtc.length > 0 ? whazzupAtc : asArray(atcResult.status === "fulfilled" ? atcResult.value : []);

  const onlineVids = new Set<string>();
  whazzupPilots.forEach((pilot) => {
    const id = extractUserId(pilot);
    if (id) onlineVids.add(id);
  });
  onlineAtc.forEach((atc) => {
    const id = extractUserId(atc);
    if (id) onlineVids.add(id);
  });

  const getDepartureIcao = (flight: unknown) =>
    extractIcao((flight as { departure?: unknown }).departure) ??
    extractIcao((flight as { departureId?: unknown }).departureId) ??
    extractIcao((flight as { flightPlan?: { departureId?: unknown } }).flightPlan?.departureId) ??
    extractIcao((flight as { origin?: unknown }).origin) ??
    extractIcao((flight as { from?: unknown }).from) ??
    extractIcao((flight as { dep?: unknown }).dep);

  const getArrivalIcao = (flight: unknown) =>
    extractIcao((flight as { arrival?: unknown }).arrival) ??
    extractIcao((flight as { arrivalId?: unknown }).arrivalId) ??
    extractIcao((flight as { flightPlan?: { arrivalId?: unknown } }).flightPlan?.arrivalId) ??
    extractIcao((flight as { destination?: unknown }).destination) ??
    extractIcao((flight as { to?: unknown }).to) ??
    extractIcao((flight as { arr?: unknown }).arr);

  const departingFlights = flights.reduce((acc: number, flight) => {
    const dep = getDepartureIcao(flight);
    return dep && airportIcaos.has(dep) ? acc + 1 : acc;
  }, 0);

  const arrivingFlights = flights.reduce((acc: number, flight) => {
    const arr = getArrivalIcao(flight);
    return arr && airportIcaos.has(arr) ? acc + 1 : acc;
  }, 0);

  const getAtcStationIcao = (atc: unknown): string | undefined =>
    extractIcao(
      (atc as { station?: unknown }).station ??
        (atc as { airport?: unknown }).airport ??
        (atc as { icao?: unknown }).icao ??
        (atc as { icaoCode?: unknown }).icaoCode ??
        (atc as { icao_code?: unknown }).icao_code ??
        (atc as { location?: { icao?: unknown } }).location?.icao ??
        (atc as { atis?: unknown }).atis ??
        (atc as { aerodrome?: unknown }).aerodrome,
    );
  const parseCoord = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const getAtcCoordinates = (atc: unknown): { lat: number; lon: number } | null => {
    const directLat = parseCoord((atc as { latitude?: unknown }).latitude ?? (atc as { lat?: unknown }).lat);
    const directLon = parseCoord((atc as { longitude?: unknown }).longitude ?? (atc as { lon?: unknown }).lon);
    if (directLat !== null && directLon !== null) return { lat: directLat, lon: directLon };
    const position = atc as { position?: { latitude?: unknown; longitude?: unknown; lat?: unknown; lon?: unknown } };
    const posLat = parseCoord(position.position?.latitude ?? position.position?.lat);
    const posLon = parseCoord(position.position?.longitude ?? position.position?.lon);
    if (posLat !== null && posLon !== null) return { lat: posLat, lon: posLon };
    const location = atc as { location?: { latitude?: unknown; longitude?: unknown; lat?: unknown; lon?: unknown } };
    const locLat = parseCoord(location.location?.latitude ?? location.location?.lat);
    const locLon = parseCoord(location.location?.longitude ?? location.location?.lon);
    if (locLat !== null && locLon !== null) return { lat: locLat, lon: locLon };
    return null;
  };
  const creatorVids = creatorsBase.map((creator) => creator.vid);
  const creatorUsers = creatorVids.length
    ? await prisma.user.findMany({
        where: { vid: { in: creatorVids } },
        select: { vid: true, creatorBannerUrl: true },
      })
    : [];
  const bannerMap = new Map(creatorUsers.map((user) => [user.vid, user.creatorBannerUrl ?? ""]));
  const creators = await Promise.all(
    creatorsBase.map(async (creator) => {
      const platform = await getCreatorPlatformStatus(creator.links);
      const isOnline = onlineVids.has(creator.vid);
      const isLive = isOnline && Boolean(platform.livePlatform);
      return {
        ...creator,
        isLive,
        livePlatform: isLive ? platform.livePlatform : null,
        liveUrl: isLive ? platform.liveUrl ?? null : null,
        bannerUrl: bannerMap.get(creator.vid) || platform.bannerUrl || null,
      };
    }),
  );
  const getAtcIcaoFromCallsign = (atc: unknown): string | undefined => {
    const rawCallsign = (atc as { callsign?: unknown }).callsign;
    const callsign = typeof rawCallsign === "string" ? rawCallsign.toUpperCase() : "";
    if (!callsign) return undefined;
    const match = callsign.match(/[A-Z]{4}/);
    return match?.[0];
  };
  const atcFallbackIcaoMap: Record<string, string> = {
    LPPC: "LPPT",
    LPPI: "LPPD",
  };
  const resolveAtcIcao = (atc: unknown): string | undefined => {
    const candidate = getAtcStationIcao(atc) ?? getAtcIcaoFromCallsign(atc);
    if (!candidate) return undefined;
    const normalized = candidate.toUpperCase();
    return atcFallbackIcaoMap[normalized] ?? normalized;
  };

  const atcInPortugal = onlineAtc.filter((atc) => {
    const rawCallsign = (atc as { callsign?: unknown }).callsign;
    const callsign = typeof rawCallsign === "string" ? rawCallsign.toUpperCase() : "";
    const stationIcao = resolveAtcIcao(atc);
    const firCode = extractIcao((atc as { fir?: unknown }).fir ?? (atc as { sector?: unknown }).sector);
    const coord = getAtcCoordinates(atc);
    if (coord && resolveRegion(coord.lon, coord.lat)) return true;
    if (stationIcao) {
      const stationCoords = airportCoordinates.get(stationIcao.toUpperCase());
      if (stationCoords && resolveRegion(stationCoords.lon, stationCoords.lat)) return true;
    }

    return callsign.startsWith("LP") || (stationIcao?.startsWith("LP") ?? false) || (firCode?.startsWith("LP") ?? false);
  });

  const getCallsign = (flight: unknown): string | undefined => {
    const raw =
      (flight as { callsign?: unknown }).callsign ??
      (flight as { flightId?: unknown }).flightId ??
      (flight as { id?: unknown }).id;
    if (raw === null || raw === undefined) return undefined;
    const value = String(raw).trim();
    return value ? value : undefined;
  };

  const getAircraftType = (flight: unknown): string | undefined => {
    const candidate =
      (flight as { aircraftType?: string }).aircraftType ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.type ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.model ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.icao ??
      (flight as { flightPlan?: { aircraft?: string; aircraftType?: string } }).flightPlan?.aircraft ??
      (flight as { flightPlan?: { aircraft?: string; aircraftType?: string } }).flightPlan?.aircraftType;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      return trimmed ? trimmed.toUpperCase() : undefined;
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
    return undefined;
  };

  const getFlightState = (flight: unknown): string | undefined => {
    const base =
      (flight as { state?: string }).state ??
      (flight as { status?: string }).status ??
      (flight as { phase?: string }).phase ??
      (flight as { flightPhase?: string }).flightPhase;

    const lastTrack = (flight as { lastTrack?: { state?: string; phase?: string; groundState?: string; onGround?: boolean; groundSpeed?: number } }).lastTrack;
    const trackState =
      lastTrack?.state ??
      lastTrack?.phase ??
      lastTrack?.groundState;

    const cleaned = typeof (base ?? trackState) === "string" ? (base ?? trackState)!.trim() : undefined;
    if (cleaned) return cleaned;

    // Derive a friendly status from ground/air data when explicit state is missing.
    const onGround = typeof lastTrack?.onGround === "boolean" ? lastTrack.onGround : undefined;
    const groundSpeedRaw =
      (lastTrack as { groundSpeed?: unknown })?.groundSpeed ??
      (flight as { groundSpeed?: unknown }).groundSpeed;
    const groundSpeed =
      typeof groundSpeedRaw === "number" && Number.isFinite(groundSpeedRaw) ? groundSpeedRaw : undefined;

    if (onGround) {
      if (groundSpeed && groundSpeed > 10) return "Taxi";
      return "On Stand";
    }

    return "En Route";
  };
  const flightsForAirports = flights
    .map((flight, idx) => {
      const dep = getDepartureIcao(flight);
      const arr = getArrivalIcao(flight);
      const hasDep = dep && airportIcaos.has(dep);
      const hasArr = arr && airportIcaos.has(arr);
      if (!hasDep && !hasArr) return null;
      const direction = hasDep ? "DEP" : "ARR";
      const matched = hasDep ? dep : arr;
      const other = hasDep ? arr : dep;
      const id =
        (flight as { id?: string | number }).id?.toString() ??
        (flight as { callsign?: string }).callsign ??
        `${matched}-${direction}-${idx}`;
      return {
        id,
        direction,
        icao: matched ?? "UNK",
        other: other ?? undefined,
        callsign: getCallsign(flight),
        aircraft: getAircraftType(flight),
        state: getFlightState(flight),
      };
    })
    .filter(Boolean) as { id: string; direction: "DEP" | "ARR"; icao: string; other?: string }[];
  const activeIcaos = new Set(flightsForAirports.map((flight) => flight.icao.toUpperCase()));
  const activeAirports = airports.filter((airport) => activeIcaos.has(airport.icao.toUpperCase()));
  const activeAirportOptions = activeAirports.map((airport) => ({ icao: airport.icao, name: airport.name }));

  const bookingsRaw = asArray(bookingsResult.status === "fulfilled" ? bookingsResult.value : []);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const parseDate = (value: unknown): Date | null => {
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };
  const bookingsToday = bookingsRaw
    .map((booking) => {
      const start = parseDate(
        (booking as { startDate?: unknown }).startDate ??
          (booking as { startTime?: unknown }).startTime ??
          (booking as { start?: unknown }).start,
      );
      const end = parseDate(
        (booking as { endDate?: unknown }).endDate ??
          (booking as { endTime?: unknown }).endTime ??
          (booking as { end?: unknown }).end,
      );
      if (!start || !end) return null;
      if (start >= todayEnd || end <= todayStart) return null;
      const callsign =
        (booking as { atcPosition?: string }).atcPosition ??
        (booking as { callsign?: string }).callsign ??
        (booking as { station?: string }).station ??
        (booking as { name?: string }).name;
      const icao = extractIcao(
        (booking as { atcPosition?: unknown }).atcPosition ??
          (booking as { icao?: unknown }).icao ??
          (booking as { station?: unknown }).station ??
          (booking as { airport?: unknown }).airport ??
          (booking as { aerodrome?: unknown }).aerodrome,
      );
      if (!(icao?.startsWith("LP") ?? false)) return null;
      return {
        id:
          (booking as { id?: string | number }).id?.toString() ??
          (booking as { bookingId?: string | number }).bookingId?.toString() ??
          `${callsign ?? icao}-${start.toISOString()}`,
        callsign: callsign ?? `${icao} ATC`,
        icao,
        window: `${start.toUTCString().slice(17, 22)} - ${end.toUTCString().slice(17, 22)}z`,
      };
    })
    .filter(Boolean)
    .slice(0, 6) as { id: string; callsign: string; icao?: string; window: string }[];

  function toDateOrNull(value: string | Date | number | null | undefined) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const formatDateTime = (value: string | Date | null | undefined) => {
    const parsed = toDateOrNull(value);
    if (!parsed) return "TBD";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(parsed);
  };
  const formatInputDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const bookingStartDefault = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingEndDefault = (() => {
    const d = new Date();
    d.setHours(1, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingMaxToday = (() => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return formatInputDateTime(d);
  })();

  const upcomingEvents = events.filter((event) => {
    const start = toDateOrNull(event.startTime);
    return start ? start >= now : false;
  });

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const upcomingTraining = calendarEvents.filter((event) => event.type === "TRAINING");
  const upcomingExams = calendarEvents.filter((event) => event.type === "EXAM");
  const nextTraining = upcomingTraining[0] ?? null;
  const nextExam = upcomingExams[0] ?? null;
  const snapshotStats = [
    { label: t("statUsers"), value: userCount },
    { label: t("statEvents"), value: events.length },
    { label: t("statAirports"), value: airportsCount },
    { label: t("statFirs"), value: firs.length },
    { label: t("statDeparting"), value: departingFlights },
    { label: t("statArriving"), value: arrivingFlights },
    { label: t("statAtcOnline"), value: atcInPortugal.length },
    { label: t("statExams"), value: upcomingExams.length },
  ];
  const lineupEvents = (upcomingEvents.length > 0 ? upcomingEvents : events).slice(0, 3);
  const fallbackAtcStations =
    featuredAirports.length > 0
      ? featuredAirports.map((airport) => ({
          code: airport.icao,
          label: `${airport.icao} ${airport.fir?.slug ?? "FIR"}`,
        }))
      : [
          { code: "LPPT", label: "LPPT | LIS" },
          { code: "LPPR", label: "LPPR | OPO" },
          { code: "LPFR", label: "LPFR | FAO" },
        ];
  const nextEvent = lineupEvents[0];
  const nextEventTime = nextEvent ? formatDateTime(nextEvent.startTime) : null;
  const nextEventAirports =
    nextEvent?.airports.map((a) => a.icao).join(", ") || nextEvent?.firs.map((f) => f.slug).join(", ");
  const nextEventBanner = nextEvent?.bannerUrl ?? "/frontpic.png";
  const examHighlights = upcomingExams.slice(0, 3);
  const firHighlights = firs.slice(0, 2);
  const nextItems = [
    ...upcomingEvents.map((event) => ({
      id: event.id,
      date: event.startTime,
      title: event.title,
      subtitle: event.airports.map((a) => a.icao).join(", ") || event.firs.map((f) => f.slug).join(", "),
      tag: "Event",
      href: `/${locale}/events/${event.slug}`,
    })),
    ...upcomingTraining.map((training) => ({
      id: training.id,
      date: training.startTime,
      title: training.title,
      subtitle: training.location ?? training.description ?? t("statTraining"),
      tag: "Training",
      href: undefined,
    })),
    ...upcomingExams.map((exam) => ({
      id: exam.id,
      date: exam.startTime,
      title: exam.title,
      subtitle: exam.location ?? exam.description ?? t("statExams"),
      tag: "Exam",
      href: undefined,
    })),
  ]
    .sort((a, b) => (toDateOrNull(a.date)?.getTime() ?? 0) - (toDateOrNull(b.date)?.getTime() ?? 0))
    .slice(0, 6);
  const mapNodes = [
    {
      code: "LPPR",
      label: "Porto",
      region: "mainland",
      isActive: activeIcaos.has("LPPR"),
      ...projectToMap(-8.6781, 41.2356, mainlandProjection),
    },
    {
      code: "LPPT",
      label: "Lisbon",
      region: "mainland",
      isActive: activeIcaos.has("LPPT"),
      ...projectToMap(-9.1342, 38.7742, mainlandProjection),
    },
    {
      code: "LPFR",
      label: "Faro",
      region: "mainland",
      isActive: activeIcaos.has("LPFR"),
      ...projectToMap(-7.9659, 37.0146, mainlandProjection),
    },
    {
      code: "LPMA",
      label: "Madeira",
      region: "madeira",
      labelOffset: { x: 6, y: 8 },
      isActive: activeIcaos.has("LPMA"),
      ...projectToMap(-16.7745, 32.6969, madeiraProjection),
    },
    {
      code: "LPPD",
      label: "Azores",
      region: "azores",
      labelOffset: { x: 8, y: -6 },
      isActive: activeIcaos.has("LPPD"),
      ...projectToMap(-25.1706, 37.7412, azoresProjection),
    },
  ];
  const insetConnectors = [
    {
      from: {
        x: mapTargets.azores.x + mapTargets.azores.width,
        y: mapTargets.azores.y + mapTargets.azores.height / 2,
      },
      to: {
        x: mapTargets.mainland.x + 2,
        y: mapTargets.mainland.y + 24,
      },
    },
    {
      from: {
        x: mapTargets.madeira.x + mapTargets.madeira.width,
        y: mapTargets.madeira.y + mapTargets.madeira.height / 2,
      },
      to: {
        x: mapTargets.mainland.x + 6,
        y: mapTargets.mainland.y + 72,
      },
    },
  ];
  const mapNodesTransformed = mapNodes.map((node) => ({
    ...node,
    ...applyTransform(node, mapTransforms[node.region as keyof typeof mapTransforms]),
  }));
  const primaryAirportCodes = new Set(mapNodes.map((node) => node.code));
  const getAirportPoint = (icao?: string) => {
    if (!icao) return null;
    const coords = airportCoordinates.get(icao.toUpperCase());
    if (!coords) return null;
    const region = resolveRegion(coords.lon, coords.lat);
    if (!region) return null;
    const projection =
      region === "mainland" ? mainlandProjection : region === "azores" ? azoresProjection : madeiraProjection;
    const point = projectToMap(coords.lon, coords.lat, projection);
    return applyTransform(point, mapTransforms[region]);
  };
  const flightConnections = flights
    .map((flight, idx) => {
      const dep = getDepartureIcao(flight);
      const arr = getArrivalIcao(flight);
      if (!dep || !arr) return null;
      if (!airportIcaos.has(dep) || !airportIcaos.has(arr)) return null;
      const from = getAirportPoint(dep);
      const to = getAirportPoint(arr);
      if (!from || !to) return null;
      return {
        id:
          (flight as { id?: string | number }).id?.toString() ??
          (flight as { callsign?: string }).callsign ??
          `${dep}-${arr}-${idx}`,
        from,
        to,
      };
    })
    .filter(Boolean)
    .slice(0, 5) as { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[];
  const extraAirports = airports
    .map((airport) => {
      const code = airport.icao.toUpperCase();
      if (primaryAirportCodes.has(code)) return null;
      const region = resolveRegion(airport.longitude, airport.latitude);
      if (!region) return null;
      const projection =
        region === "mainland" ? mainlandProjection : region === "azores" ? azoresProjection : madeiraProjection;
      const point = projectToMap(airport.longitude, airport.latitude, projection);
      return {
        code,
        name: airport.name,
        region,
        isActive: activeIcaos.has(code),
        ...applyTransform(point, mapTransforms[region]),
      };
    })
    .filter(
      (
        airport,
      ): airport is {
        code: string;
        name: string;
        region: "mainland" | "azores" | "madeira";
        isActive: boolean;
        x: number;
        y: number;
      } =>
        Boolean(airport),
    );
  return (
    <main className="flex flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:gap-12">
        <section className="relative overflow-hidden rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--text-primary)]">
        <div className="relative grid gap-8 p-10 lg:grid-cols-[1.1fr_0.9fr] lg:p-14">
          <div className="space-y-6 lg:pr-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                {session?.user ? t("signedInTitle", { name: firstName ?? "" }) : t("title")}
              </h1>
              <p className="max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">
                {session?.user ? t("signedInSubtitle") : t("subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {session?.user ? (
                <>
                  <Link href={`/${locale}/profile`}>
                    <Button className="shadow-[0_12px_30px_rgba(44,107,216,0.35)]">{t("ctaDashboard")}</Button>
                  </Link>
                  <Link href={`/${locale}/events`}>
                    <Button
                      variant="secondary"
                      className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                    >
                      {t("ctaEvents")}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href={loginUrl}>
                    <Button className="shadow-[0_12px_30px_rgba(44,107,216,0.35)]">{t("ctaJoin")}</Button>
                  </Link>
                  <Link href={`/${locale}/events`}>
                    <Button
                      variant="secondary"
                      className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                    >
                      {t("ctaEvents")}
                    </Button>
                  </Link>
                  <Link href="https://events.pt.ivao.aero/" target="_blank" rel="noreferrer">
                    <Button
                      variant="secondary"
                      className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                    >
                      {t("ctaTours")}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-transparent p-6">
            <div className="absolute inset-0 z-0">
              <svg
                className="absolute inset-0 h-full w-full opacity-85 pointer-events-auto"
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                pointerEvents="all"
              >
                <defs>
                  <filter id="airport-blur" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
                  </filter>
                </defs>
                <rect
                  x={azoresInsetRect.x}
                  y={azoresInsetRect.y}
                  width={azoresInsetRect.width}
                  height={azoresInsetRect.height}
                  rx="2"
                  fill="rgba(44,107,216,0.08)"
                  stroke="var(--primary)"
                  strokeOpacity="0.5"
                  strokeWidth="0.45"
                  strokeDasharray="2 2.5"
                />
                <text
                  x={mapTargets.azores.x + 1.2}
                  y={mapTargets.azores.y + 2.8}
                  fill="rgba(44,72,140,0.65)"
                  fontSize="2.6"
                  fontWeight="600"
                  letterSpacing="0.8"
                >
                  AZORES
                </text>
                <rect
                  x={madeiraInsetRect.x}
                  y={madeiraInsetRect.y}
                  width={madeiraInsetRect.width}
                  height={madeiraInsetRect.height}
                  rx="2"
                  fill="rgba(44,107,216,0.08)"
                  stroke="var(--primary)"
                  strokeOpacity="0.5"
                  strokeWidth="0.45"
                  strokeDasharray="2 2.5"
                />
                <text
                  x={mapTargets.madeira.x + 1.1}
                  y={mapTargets.madeira.y + 2.6}
                  fill="rgba(44,72,140,0.65)"
                  fontSize="2.4"
                  fontWeight="600"
                  letterSpacing="0.8"
                >
                  MADEIRA
                </text>
                {insetConnectors.map((connector, idx) => (
                  <line
                    key={`inset-${idx}`}
                    x1={connector.from.x}
                    y1={connector.from.y}
                    x2={connector.to.x}
                    y2={connector.to.y}
                    stroke="var(--primary)"
                    strokeOpacity="0.5"
                    strokeWidth="0.35"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="2 3"
                  />
                ))}
                <g transform={svgTransform(mapTransforms.mainland)}>
                  {portugalMainlandPaths.map((path, idx) => (
                    <path
                      key={`mainland-${idx}`}
                      d={path}
                      fill="rgba(44,107,216,0.18)"
                      stroke="var(--primary)"
                      strokeWidth="0.45"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                <g transform={svgTransform(mapTransforms.azores)}>
                  {portugalAzoresPaths.map((path, idx) => (
                    <path
                      key={`azores-${idx}`}
                      d={path}
                      fill="rgba(44,107,216,0.18)"
                      stroke="var(--primary)"
                      strokeWidth="0.45"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                <g transform={svgTransform(mapTransforms.madeira)}>
                  {portugalMadeiraPaths.map((path, idx) => (
                    <path
                      key={`madeira-${idx}`}
                      d={path}
                      fill="rgba(44,107,216,0.18)"
                      stroke="var(--primary)"
                      strokeWidth="0.45"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                {flightConnections.map((connection, idx) => {
                  const pathId = `flight-path-${idx}`;
                  return (
                    <g key={`flight-${connection.id}`}>
                      <path
                        id={pathId}
                        d={`M${connection.from.x},${connection.from.y} L${connection.to.x},${connection.to.y}`}
                        stroke="rgba(24,86,179,0.9)"
                        strokeOpacity="0.9"
                        strokeWidth="0.75"
                        vectorEffect="non-scaling-stroke"
                        strokeDasharray="3 2"
                      />
                      <g>
                        <path
                          d="M0,-1.2 L2.4,0 L0,1.2 L0.5,0 Z"
                          fill="rgba(24,86,179,0.92)"
                          stroke="rgba(255,255,255,0.7)"
                          strokeWidth="0.15"
                        />
                        <animateMotion
                          dur="22s"
                          repeatCount="indefinite"
                          rotate="auto"
                          begin={`${idx * 1.2}s`}
                        >
                          <mpath href={`#${pathId}`} />
                        </animateMotion>
                      </g>
                    </g>
                  );
                })}
                {mapNodesTransformed.map((node) => {
                  const offset = (node as { labelOffset?: { x?: number; y?: number } }).labelOffset ?? {};
                  const labelX = node.x + (offset.x ?? 0);
                  const labelY = node.y + (offset.y ?? 0);
                  const isActive = (node as { isActive?: boolean }).isActive ?? false;
                  const activeColor = "var(--map-highlight)";
                  return (
                    <g key={node.code} className="group">
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="3"
                        fill={isActive ? activeColor : "var(--primary)"}
                        opacity={isActive ? 0.75 : 0.65}
                        filter="url(#airport-blur)"
                      >
                        {isActive ? (
                          <animate
                            attributeName="opacity"
                            values="0.35;0.7;0.35"
                            dur="2.0s"
                            repeatCount="indefinite"
                          />
                        ) : null}
                      </circle>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r="1.8"
                        fill={isActive ? activeColor : "var(--primary)"}
                        opacity={isActive ? 0.9 : 0.75}
                      />
                      {isActive ? (
                        <g className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <rect
                          x={labelX - 7.2}
                          y={labelY - 6.2}
                          width="14.4"
                          height="7.6"
                          rx="1"
                          fill="rgba(11,19,36,0.78)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.2"
                        />
                        <text
                          x={labelX}
                          y={labelY - 3.4}
                          fontSize="2.2"
                          fontWeight="600"
                          letterSpacing="0.6"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.65)"
                        >
                          {node.label}
                        </text>
                        <text
                          x={labelX}
                          y={labelY - 1}
                          fontSize="2.6"
                          fontWeight="700"
                          letterSpacing="0.8"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.9)"
                        >
                          {node.code}
                        </text>
                      </g>
                      ) : null}
                    </g>
                  );
                })}
                {extraAirports.map((airport) => {
                  const name = airport.name.trim();
                  const displayName = name.length > 18 ? `${name.slice(0, 18)}...` : name;
                  const labelWidth = Math.min(26, Math.max(11, Math.max(displayName.length, airport.code.length) * 1.1 + 4));
                  const labelX = airport.x + 1.6;
                  const labelY = airport.y - 7;
                  const activeColor = "var(--map-highlight)";
                  return (
                    <g key={`extra-${airport.code}`} className="group">
                      {airport.isActive ? (
                        <circle
                          cx={airport.x}
                          cy={airport.y}
                          r="2.2"
                          fill={activeColor}
                          opacity="0.5"
                          filter="url(#airport-blur)"
                        >
                          <animate attributeName="opacity" values="0.25;0.55;0.25" dur="2.2s" repeatCount="indefinite" />
                        </circle>
                      ) : null}
                      <circle
                        cx={airport.x}
                        cy={airport.y}
                        r="1.1"
                        fill={airport.isActive ? activeColor : "var(--primary)"}
                        opacity={airport.isActive ? 0.8 : 0.6}
                      />
                      {airport.isActive ? (
                        <g className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <rect
                          x={labelX}
                          y={labelY}
                          width={labelWidth}
                          height="8"
                          rx="1"
                          fill="rgba(11,19,36,0.75)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.2"
                        />
                        <text
                          x={labelX + labelWidth / 2}
                          y={labelY + 3.2}
                          fontSize="2.1"
                          fontWeight="600"
                          letterSpacing="0.5"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.65)"
                        >
                          {displayName}
                        </text>
                        <text
                          x={labelX + labelWidth / 2}
                          y={labelY + 6.2}
                          fontSize="2.4"
                          fontWeight="700"
                          letterSpacing="0.6"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.9)"
                        >
                          {airport.code}
                        </text>
                      </g>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="relative h-[260px] pointer-events-none" />
          </div>
        </div>
      </section>
      {creators.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Community</p>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Local creators</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              Streamers and video creators from IVAO Portugal.
            </p>
          </div>
          <CreatorsCarousel creators={creators} />
        </section>
      ) : null}
      {airlines.length > 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Community</p>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Virtual airlines</h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              Local virtual airlines operating within IVAO Portugal.
            </p>
          </div>
          <AirlinesCarousel locale={locale} airlines={airlines} />
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden bg-[color:var(--surface)] text-[color:var(--text-primary)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${nextEventBanner})` }}
          />
          <div className="absolute inset-0 bg-[color:var(--surface)] opacity-75" />
          <div className="relative flex h-full flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("summaryEventsTitle")}</p>
              {nextEventTime ? (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
                  {nextEventTime}
                </span>
              ) : null}
            </div>
            {nextEvent ? (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{nextEvent.title}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {nextEventAirports || t("eventsDescription")}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/${locale}/events/${nextEvent.slug}`}>
                    <Button
                      size="sm"
                      data-analytics="cta"
                      data-analytics-label="Home next event"
                      data-analytics-href={`/${locale}/events/${nextEvent.slug}`}
                    >
                      {t("ctaNextEvent")}
                    </Button>
                  </Link>
                  <Link href={`/${locale}/events`}>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                      data-analytics="cta"
                      data-analytics-label="Home events list"
                      data-analytics-href={`/${locale}/events`}
                    >
                      {t("ctaEvents")}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-[color:var(--text-muted)]">{t("summaryEventsFallback")}</p>
                <Link href={`/${locale}/events`} className="inline-flex">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                    data-analytics="cta"
                    data-analytics-label="Home events fallback"
                    data-analytics-href={`/${locale}/events`}
                  >
                    {t("ctaEvents")}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-[#F9CC2C] text-[#2b2104]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_50%),radial-gradient(circle_at_80%_0%,rgba(150,110,0,0.18),transparent_55%)]" />
          <div className="relative space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-[#5a4108]">{t("manualsTitle")}</p>
              <p className="text-lg font-semibold text-[#2b2104]">{t("manualsDescription")}</p>
            </div>
            <div className="space-y-2 text-sm text-[#3a2a06]">
              {nextTraining ? (
                <div className="rounded-xl bg-[#f6d66b] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5a4108]">{t("calendarTrainingLabel")}</p>
                  <p className="font-semibold text-[#2b2104]">{nextTraining.title}</p>
                  <p className="text-xs text-[#5a4108]">{formatDateTime(nextTraining.startTime)}</p>
                  {nextTraining.location ? <p className="text-xs text-[#5a4108]">{nextTraining.location}</p> : null}
                </div>
              ) : (
                <p>{t("calendarTrainingEmpty")}</p>
              )}
              {nextExam ? (
                <div className="rounded-xl bg-[#f6d66b] px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5a4108]">{t("calendarExamLabel")}</p>
                  <p className="font-semibold text-[#2b2104]">{nextExam.title}</p>
                  <p className="text-xs text-[#5a4108]">{formatDateTime(nextExam.startTime)}</p>
                  {nextExam.location ? <p className="text-xs text-[#5a4108]">{nextExam.location}</p> : null}
                </div>
              ) : (
                <p>{t("calendarExamEmpty")}</p>
              )}
            </div>
            <p className="text-sm text-[#5a4108]">{t("manualsBody")}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4">
        {activeAirportOptions.length === 0 ? (
          <Card className="bg-[color:var(--surface)] text-[color:var(--text-primary)]">
            <p className="text-sm text-[color:var(--text-muted)]">{t("summaryAirspaceFallback")}</p>
          </Card>
        ) : (
          <AirportTimetable
            airports={activeAirportOptions}
            labels={{
              choose: tAirports("timetableChoose"),
              button: tAirports("timetableButton"),
              inbound: tAirports("timetableInbound"),
              outbound: tAirports("timetableOutbound"),
              empty: tAirports("timetableEmpty"),
              loading: tAirports("timetableLoading"),
              error: tAirports("timetableError"),
              updated: tAirports("timetableUpdated"),
            }}
            allowPicker
          />
        )}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="relative overflow-hidden bg-[color:var(--surface)] text-[color:var(--text-primary)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(44,107,216,0.14),transparent_50%)]" />
          <div className="relative space-y-3 p-1">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
              <span>ATC bookings today</span>
              <span className="text-[10px] text-[color:var(--text-muted)]">UTC</span>
            </div>
            <div className="grid max-h-[140px] gap-2 overflow-y-auto pr-1 text-xs text-[color:var(--text-muted)]">
              {bookingsToday.length === 0 ? (
                <p className="text-[11px] text-[color:var(--text-muted)]">No bookings yet. Grab a slot and staff will support.</p>
              ) : (
                bookingsToday.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-muted)] shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color:var(--surface-2)] text-[11px] font-semibold text-[color:var(--primary)]">
                        {b.icao ?? "LP"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{b.callsign}</p>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">ATC booking</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-primary)]">
                      {b.window}
                    </span>
                  </div>
                ))
              )}
            </div>
            {session?.user ? (
              <BookStationModal
                action={createAtcBookingAction}
                stations={fallbackAtcStations}
                bookingStartDefault={bookingStartDefault}
                bookingEndDefault={bookingEndDefault}
                bookingMaxToday={bookingMaxToday}
              />
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-[11px] uppercase tracking-[0.1em]">
                <span>Want to control?</span>
                <span className="font-semibold text-[color:var(--text-primary)]">{t("calendarGuestHint")}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-[color:var(--surface-2)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(44,107,216,0.12),transparent_45%)]" />
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("feedTitle")}</p>
                <p className="text-lg font-semibold text-[color:var(--text-primary)]">{t("summaryEventsTitle")}</p>
              </div>
              <Link href={`/${locale}/events`}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-0"
                  data-analytics="cta"
                  data-analytics-label="Home feed events"
                  data-analytics-href={`/${locale}/events`}
                >
                  {t("ctaEvents")} -&gt;
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {nextItems.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">{t("summaryEventsFallback")}</p>
              ) : (
                nextItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[color:var(--surface-3)] p-3"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      <span>{formatDateTime(item.date)}</span>
                      <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] font-semibold text-[color:var(--primary)]">
                        {item.tag}
                      </span>
                    </div>
                    <div className="mt-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</p>
                        {item.subtitle ? (
                          <p className="text-xs text-[color:var(--text-muted)]">{item.subtitle}</p>
                        ) : null}
                      </div>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="text-[11px] font-semibold text-[color:var(--primary)] underline"
                          data-analytics="cta"
                          data-analytics-label="Home feed item"
                          data-analytics-href={item.href}
                        >
                          {t("ctaNextEvent")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("statExams")}</p>
              {examHighlights.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">{t("feedEmpty")}</p>
              ) : (
                examHighlights.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-3)] px-3 py-2 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{exam.title}</p>
                      <p className="text-[11px] text-[color:var(--text-muted)]">{formatDateTime(exam.startTime)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-[color:var(--surface)] lg:col-span-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(44,107,216,0.12),transparent_45%)]" />
          <div className="relative space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("firsTitle")}</p>
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">{t("statsTitle")}</p>
            </div>
            <div className="space-y-2">
              {firHighlights.map((fir) => (
                <div
                  key={fir.id}
                  className="flex items-center justify-between rounded-2xl bg-[color:var(--surface-3)] px-3 py-2 text-xs"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{fir.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      {fir.slug}
                    </p>
                    {fir.ivaoSyncedAt ? (
                      <p className="text-[11px] text-[color:var(--text-muted)]">
                        Last updated {new Date(fir.ivaoSyncedAt).toLocaleDateString(locale)}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right text-[11px] text-[color:var(--text-muted)]">
                    <p>
                      {fir.airports.length} {t("statAirports")}
                    </p>
                    <p>
                      {fir.events.length} {t("statEvents")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {snapshotStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-[color:var(--surface-3)] px-3 py-3"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                    {item.label}
                  </p>
                  <p className="text-xl font-bold text-[color:var(--primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
      <section className="grid gap-4">
        <Card className="relative overflow-hidden bg-[color:var(--surface-2)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(44,107,216,0.12),transparent_45%)]" />
          <div className="relative space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("calendarCardTitle")}</p>
            {nextTraining || nextExam ? (
              <div className="space-y-3">
                {nextTraining ? (
                  <div className="rounded-2xl bg-[color:var(--surface-3)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("calendarTrainingLabel")}</p>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{nextTraining.title}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{formatDateTime(nextTraining.startTime)}</p>
                  </div>
                ) : null}
                {nextExam ? (
                  <div className="rounded-2xl bg-[color:var(--surface-3)] px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("calendarExamLabel")}</p>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{nextExam.title}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{formatDateTime(nextExam.startTime)}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">{t("calendarCardEmpty")}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={loginUrl}>
                <Button variant="secondary" size="sm">
                  {t("ctaJoin")}
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
      </div>
    </main>
  );
}










