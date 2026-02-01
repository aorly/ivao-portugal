import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { normalizeIvaoEvents } from "@/lib/ivao-events";
import { CreatorsCarousel } from "@/components/public/creators-carousel";
import { AnimatedTestimonials } from "@/components/public/animated-testimonials";
import { HomeHeroClient } from "@/components/public/home-hero-client";
import { EventsSlider } from "@/components/public/events-slider";
import { LiveAirspaceSection } from "@/components/public/live-airspace-section";
import { MetarSpotlightCard } from "@/components/public/metar-spotlight-card";
import { MetarWorstCard } from "@/components/public/metar-worst-card";
import { getSiteConfig } from "@/lib/site-config";
import { getCreatorPlatformStatus } from "@/lib/creator-platforms";
import { createAtcBookingAction } from "./actions";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { syncCalendarIfStale } from "@/lib/calendar-sync";
import { fetchMetarTaf } from "@/lib/weather";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export const revalidate = 60;

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

const normalizeMetar = (metar: string | null) => {
  if (!metar) return null;
  if (metar.toLowerCase().includes("not available")) return null;
  return metar;
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
  const metersMatch = metar.match(/\b(?![QA])(\d{4})\b/);
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
  const tIvao = await getTranslations({ locale, namespace: "ivaoEvents" });
  const tAirports = await getTranslations({ locale, namespace: "airports" });
  const fetchSiteConfig = unstable_cache(
    async () => getSiteConfig(),
    ["public-site-config"],
    { revalidate: 120 },
  );
  const siteConfig = await fetchSiteConfig();
  const now = new Date();
  const discordWidgetUrl = siteConfig.discordWidgetUrl?.trim();

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
            select: {
              icao: true,
              name: true,
              latitude: true,
              longitude: true,
              updatedAt: true,
              featured: true,
              runways: true,
              trainingImageUrl: true,
              fir: { select: { slug: true } },
            },
          }),
      ]);
    },
    ["public-home-data"],
    { revalidate: 120 },
  );

  const [
    events,
    calendarEvents,
    airports,
  ] = await fetchHomeData();

  const fetchIvaoEvents = unstable_cache(
    async () => normalizeIvaoEvents(await ivaoClient.getEvents().catch(() => [])),
    ["public-ivao-events"],
    { revalidate: 900 },
  );
  const ivaoEvents = await fetchIvaoEvents();

  const fetchTestimonials = unstable_cache(
    async () =>
      prisma.testimonial.findMany({
        where: { status: "APPROVED" },
        orderBy: { approvedAt: "desc" },
        take: 20,
        include: { user: { select: { avatarUrl: true, avatarColor: true } } },
      }),
    ["public-testimonials"],
    { revalidate: 300 },
  );
  const testimonialsRaw = await fetchTestimonials();
  const testimonials = [...testimonialsRaw]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      role: entry.role,
      content: entry.content,
      avatarUrl: entry.user?.avatarUrl ?? null,
      avatarColor: entry.user?.avatarColor ?? null,
    }));

  const fetchAirlines = unstable_cache(
    async () =>
      prisma.airline.findMany({
        where: {
          OR: [{ countryId: "PT" }, { countryId: "pt" }],
        },
        select: { icao: true, name: true, logoUrl: true, logoDarkUrl: true },
        orderBy: { name: "asc" },
        take: 12,
      }),
    ["public-airlines"],
    { revalidate: 600 },
  );
  const airlines = await fetchAirlines();

  const fetchHeroSlides = unstable_cache(
    async () =>
      prisma.heroSlide.findMany({
        where: { locale, isPublished: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      }),
    ["public-hero-slides", locale],
    { revalidate: 300 },
  );
  const heroSlides = await fetchHeroSlides();

  const normalizeHeroHref = (href?: string | null) => {
    if (!href) return null;
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) {
      if (href === `/${locale}` || href.startsWith(`/${locale}/`)) return href;
      return `/${locale}${href}`;
    }
    return href;
  };

  const resolvedHeroSlides = heroSlides.map((slide) => ({
    id: slide.id,
    eyebrow: slide.eyebrow,
    title: slide.title,
    subtitle: slide.subtitle,
    imageUrl: slide.imageUrl,
    imageAlt: slide.imageAlt,
    ctaLabel: slide.ctaLabel,
    ctaHref: normalizeHeroHref(slide.ctaHref),
    secondaryLabel: slide.secondaryLabel,
    secondaryHref: normalizeHeroHref(slide.secondaryHref),
    fullWidth: slide.fullWidth ?? false,
  }));

  const featuredAirports =
    airports.filter((airport) => airport.featured).length > 0
      ? airports.filter((airport) => airport.featured)
      : [...airports]
          .sort((a, b) => {
            const aTime = toDateOrNull(a.updatedAt)?.getTime() ?? 0;
            const bTime = toDateOrNull(b.updatedAt)?.getTime() ?? 0;
            return bTime - aTime;
          })
          .slice(0, 3);
  const featuredAirportSummaries = featuredAirports.map((airport) => ({
    icao: airport.icao,
    name: airport.name,
    fir: airport.fir,
    runways: airport.runways,
  }));

  const fetchFeaturedMetars = unstable_cache(
    async () =>
      Promise.all(
        featuredAirports.map(async (airport) => {
          const weather = await withTimeout(fetchMetarTaf(airport.icao), 2500, { metar: null, taf: null });
          const metar = normalizeMetar(weather?.metar ?? null);
          return {
            ...airport,
            metar,
            windKts: parseWindKts(metar),
            visibilityMeters: parseVisibilityMeters(metar),
            rainScore: parseRainScore(metar),
          };
        }),
      ),
    ["public-home-featured-metar", ...featuredAirports.map((airport) => airport.icao)],
    { revalidate: 120 },
  );
  const featuredMetars = await fetchFeaturedMetars();
  const worstWeather =
    featuredMetars
      .filter((airport) => airport.metar)
      .sort((a, b) => {
        if (b.windKts !== a.windKts) return b.windKts - a.windKts;
        if (a.visibilityMeters !== b.visibilityMeters) return a.visibilityMeters - b.visibilityMeters;
        return b.rainScore - a.rainScore;
      })[0] ?? null;
  const spotlightAirport = featuredMetars[0] ?? null;

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
    const candidate: unknown =
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
  const allAirportOptions = airports.map((airport) => ({ icao: airport.icao, name: airport.name }));

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
  const upcomingIvaoEvents = ivaoEvents
    .map((event) => ({
      ...event,
      start: toDateOrNull(event.startTime),
      end: toDateOrNull(event.endTime),
    }))
    .filter((event) => event.start && event.start >= now)
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));

  const localEventCards = upcomingEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    bannerUrl: event.bannerUrl ?? "/frontpic.png",
    location:
      event.airports.map((a) => a.icao).join(", ") ||
      event.firs.map((f) => f.slug).join(", ") ||
      "Portugal",
    href: `/${locale}/events/${event.slug}`,
    isExternal: false,
  }));
  const trainingImageByIcao = new Map(
    airports.map((airport) => [airport.icao.toUpperCase(), airport.trainingImageUrl ?? null]),
  );
  const extractIcaos = (value: string | null | undefined) => {
    if (!value) return [];
    const upper = value.toUpperCase();
    const matches: string[] = upper.match(/\b[A-Z]{4}\b/g) ?? [];
    const tokens = upper.split(/[^A-Z0-9_]+/).filter(Boolean);
    tokens.forEach((token) => {
      if (/^[A-Z]{4}_.+/.test(token)) {
        matches.push(token.slice(0, 4));
      }
    });
    return Array.from(new Set(matches));
  };
  const pickTrainingImage = (location: string | null | undefined, title: string | null | undefined) => {
    const candidates = [...extractIcaos(location), ...extractIcaos(title)];
    for (const code of candidates) {
      const url = trainingImageByIcao.get(code);
      if (url) return url;
    }
    return null;
  };

  const calendarCards = calendarEvents.map((event) => ({
    id: `calendar-${event.id}`,
    title: `${event.type === "EXAM" ? "Exam" : "Training"}: ${event.title}`,
    start: event.startTime,
    end: event.endTime ?? event.startTime,
    bannerUrl: pickTrainingImage(event.location, event.title) ?? "/frontpic.png",
    location: event.location ?? "IVAO Portugal",
    href: `/${locale}/home#training-calendar`,
    isExternal: false,
  }));
  const ivaoEventCards = upcomingIvaoEvents.map((event) => {
    const fallbackUrl = event.id && /^\d+$/.test(event.id) ? `https://ivao.events/${event.id}` : null;
    const href = event.externalUrl ?? fallbackUrl ?? `/${locale}/ivao-events`;
    return {
      id: event.id,
      title: event.title,
      start: event.start ?? event.startTime,
      end: event.end ?? event.endTime,
      bannerUrl: event.bannerUrl ?? "/frontpic.png",
      location: event.airports.join(", ") || event.divisions.join(", ") || "IVAO Network",
      href,
      isExternal: true,
    };
  });
  const hasLocalEvents = localEventCards.length > 0;
  const hasLocalCalendar = calendarCards.length > 0;
  const useLocalEvents = hasLocalEvents || hasLocalCalendar;
  const localHighlights = [...localEventCards, ...calendarCards].sort(
    (a, b) => (toDateOrNull(a.start)?.getTime() ?? 0) - (toDateOrNull(b.start)?.getTime() ?? 0),
  );
  const eventsTitle = useLocalEvents ? t("summaryEventsTitle") : tIvao("title");
  const eventsSubtitle = useLocalEvents ? t("eventsDescription") : tIvao("subtitle");
  const eventsCtaHref = hasLocalEvents
    ? `/${locale}/events`
    : hasLocalCalendar
      ? `/${locale}/home#training-calendar`
      : `/${locale}/ivao-events`;
  const eventsCtaLabel = hasLocalEvents ? t("ctaEvents") : hasLocalCalendar ? t("ctaTraining") : tIvao("title");
  const eventsEmptyLabel = useLocalEvents ? t("summaryEventsFallback") : tIvao("emptyUpcoming");
  const eventsForSlider = (useLocalEvents ? localHighlights : ivaoEventCards).slice(0, 10);
  const fallbackAtcStations =
    featuredAirportSummaries.length > 0
      ? featuredAirportSummaries.map((airport) => ({
          code: airport.icao,
          label: `${airport.icao} ${airport.fir?.slug ?? "FIR"}`,
        }))
      : [
          { code: "LPPT", label: "LPPT | LIS" },
          { code: "LPPR", label: "LPPR | OPO" },
          { code: "LPFR", label: "LPFR | FAO" },
        ];
  const mapNodeForIcao = (
    code: string,
    label: string,
    fallbackLon: number,
    fallbackLat: number,
    fallbackRegion: "mainland" | "azores" | "madeira",
    labelOffset?: { x: number; y: number },
  ) => {
    const coords = airportCoordinates.get(code);
    const lon = coords?.lon ?? fallbackLon;
    const lat = coords?.lat ?? fallbackLat;
    const resolvedRegion = resolveRegion(lon, lat) ?? fallbackRegion;
    const projection =
      resolvedRegion === "mainland" ? mainlandProjection : resolvedRegion === "azores" ? azoresProjection : madeiraProjection;
    return {
      code,
      label,
      region: resolvedRegion,
      labelOffset,
      isActive: activeIcaos.has(code),
      ...projectToMap(lon, lat, projection),
    };
  };

  const mapNodes = [
    mapNodeForIcao("LPPR", "Porto", -8.6781, 41.2356, "mainland"),
    mapNodeForIcao("LPPT", "Lisbon", -9.1342, 38.7742, "mainland"),
    mapNodeForIcao("LPFR", "Faro", -7.9659, 37.0146, "mainland"),
    mapNodeForIcao("LPMA", "Madeira", -16.7745, 32.6969, "madeira", { x: 6, y: 8 }),
    mapNodeForIcao("LPPD", "Azores", -25.1706, 37.7412, "azores", { x: 8, y: -6 }),
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
  const atcNodes = atcInPortugal
    .map((atc) => {
      const icao = resolveAtcIcao(atc);
      if (icao && primaryAirportCodes.has(icao)) return null;
      const direct = getAtcCoordinates(atc);
      const coords = direct ?? (icao ? airportCoordinates.get(icao) : null);
      if (!coords) return null;
      const region = resolveRegion(coords.lon, coords.lat);
      if (!region) return null;
      const projection =
        region === "mainland" ? mainlandProjection : region === "azores" ? azoresProjection : madeiraProjection;
      const point = projectToMap(coords.lon, coords.lat, projection);
      return {
        id:
          String((atc as { id?: string | number }).id ?? "") ||
          String((atc as { callsign?: string }).callsign ?? icao ?? "ATC"),
        callsign: String((atc as { callsign?: string }).callsign ?? icao ?? "ATC"),
        icao: icao ?? null,
        ...applyTransform(point, mapTransforms[region]),
      };
    })
    .filter(Boolean) as { id: string; callsign: string; icao: string | null; x: number; y: number }[];
  const atcList = atcInPortugal
    .map((atc) => {
      const callsign = String((atc as { callsign?: string }).callsign ?? "").trim();
      const icao = resolveAtcIcao(atc);
      const rawFrequency =
        (atc as { frequency?: unknown }).frequency ??
        (atc as { freq?: unknown }).freq ??
        (atc as { atcFrequency?: unknown }).atcFrequency ??
        (atc as { atc?: { frequency?: unknown } }).atc?.frequency ??
        (atc as { atis?: { frequency?: unknown } }).atis?.frequency;
      const frequency =
        typeof rawFrequency === "string" || typeof rawFrequency === "number"
          ? String(rawFrequency).trim()
          : null;
      if (!callsign) return null;
      return { callsign, icao, frequency };
    })
    .filter(Boolean) as { callsign: string; icao?: string; frequency: string | null }[];
  return (
    <main className="flex flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-12">
        <section className="relative overflow-hidden rounded-3xl bg-[color:var(--surface-2)] text-[color:var(--text-primary)]">
          <HomeHeroClient slides={resolvedHeroSlides} locale={locale} />
        </section>
        <section className="space-y-6 my-12 sm:my-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
                {useLocalEvents ? t("summaryEventsTitle") : tIvao("eyebrow")}
              </p>
              <h2 className="text-2xl font-semibold text-[color:var(--text-primary)]">{eventsTitle}</h2>
              <p className="text-sm text-[color:var(--text-muted)]">{eventsSubtitle}</p>
            </div>
            <Link href={eventsCtaHref}>
              <Button
                variant="secondary"
                className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                data-analytics="cta"
                data-analytics-label="Home events CTA"
                data-analytics-href={eventsCtaHref}
              >
                {eventsCtaLabel}
              </Button>
            </Link>
          </div>
          {eventsForSlider.length === 0 ? (
            <Card className="bg-[color:var(--surface)] text-[color:var(--text-primary)]">
              <p className="text-sm text-[color:var(--text-muted)]">{eventsEmptyLabel}</p>
            </Card>
          ) : (
            <EventsSlider events={eventsForSlider} locale={locale} />
          )}
        </section>
        <LiveAirspaceSection
          locale={locale}
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
          airports={allAirportOptions}
          title={t("summaryAirspaceTitle")}
          description={t("summaryAirspaceBody")}
          ctaLabel={t("summaryAirspaceCta")}
          fallbackLabel={t("summaryAirspaceFallback")}
          atcLabel={t("liveAtcLabel")}
          bookingsTitle={t("bookingsTitle")}
          bookingsEmpty={t("bookingsEmpty")}
          bookingAction={createAtcBookingAction}
          bookingStations={fallbackAtcStations}
          bookingStartDefault={bookingStartDefault}
          bookingEndDefault={bookingEndDefault}
          bookingMaxToday={bookingMaxToday}
          bookingGuestHint={t("calendarGuestHint")}
          autoAuthCheck
          bookings={bookingsToday.map((booking) => ({
            id: booking.id,
            callsign: booking.callsign,
            icao: booking.icao,
            window: booking.window,
          }))}
          mapTargets={mapTargets}
          azoresInsetRect={azoresInsetRect}
          madeiraInsetRect={madeiraInsetRect}
          insetConnectors={insetConnectors}
          mainlandTransform={svgTransform(mapTransforms.mainland)}
          azoresTransform={svgTransform(mapTransforms.azores)}
          madeiraTransform={svgTransform(mapTransforms.madeira)}
          mainlandPaths={portugalMainlandPaths}
          azoresPaths={portugalAzoresPaths}
          madeiraPaths={portugalMadeiraPaths}
          flightConnections={flightConnections}
          mapNodes={mapNodesTransformed}
          extraAirports={extraAirports}
          atcNodes={atcNodes}
          atcList={atcList}
        />
      <section className="grid gap-6 my-10 sm:my-12 lg:grid-cols-[1.1fr_0.9fr]">
        <MetarSpotlightCard
          className="lg:min-h-[320px]"
          initialIcao={spotlightAirport?.icao ?? "LPPT"}
          initialMetar={spotlightAirport?.metar ?? null}
          featured={featuredMetars.map((airport) => ({ icao: airport.icao, name: airport.name }))}
          refreshIntervalMs={60000}
          labels={{
            title: t("weatherSpotlightTitle"),
            subtitle: t("weatherSpotlightSubtitle"),
            inputLabel: t("weatherSearchLabel"),
            button: t("weatherSearchButton"),
            empty: t("weatherSearchEmpty"),
          }}
        />
        <MetarWorstCard
          className="lg:min-h-[320px]"
          featured={featuredAirportSummaries.map((airport) => ({
            icao: airport.icao,
            name: airport.name,
            runways: airport.runways,
          }))}
          initialWorst={worstWeather}
          refreshIntervalMs={60000}
          labels={{
            title: t("weatherWorstTitle"),
            subtitle: t("weatherWorstSubtitle"),
            empty: t("weatherWorstEmpty"),
          }}
        />
      </section>
      <section id="training-calendar" className="my-10 sm:my-12" />
      <section className="space-y-8 my-10 sm:my-12">
        {creators.length > 0 ? (
          <section className="space-y-6">
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
        {discordWidgetUrl ? (
          <section className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Community</p>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">Join our Discord</h2>
              <p className="text-sm text-[color:var(--text-muted)]">Chat live with controllers, pilots, and staff.</p>
            </div>
            <Card className="overflow-hidden bg-[color:var(--surface)]">
              <iframe
                title="IVAO Portugal Discord"
                src={discordWidgetUrl}
                className="h-[360px] w-full border-0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                loading="lazy"
              />
            </Card>
          </section>
        ) : null}
        {airlines.length > 0 ? (
          <section className="space-y-6">
            <div className="relative flex flex-col px-6 py-10 text-center text-[color:var(--text-primary)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                IVAO Portugal
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
                Virtual airlines flying Portugal on IVAO
              </h2>
              <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                Verified operators with active communities and full dispatch support.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                {airlines.slice(0, 6).map((airline) => (
                  <Link
                    key={airline.icao}
                    href={`/${locale}/airlines/${airline.icao}`}
                    className="group flex h-24 w-36 items-center justify-center px-4 transition duration-150 ease-out hover:scale-105 active:scale-95"
                  >
                        {airline.logoUrl || airline.logoDarkUrl ? (
                          <>
                            <Image
                              src={airline.logoUrl || airline.logoDarkUrl || ""}
                              alt={airline.name}
                              width={160}
                              height={80}
                              sizes="(min-width: 1024px) 160px, 120px"
                              className="logo-light h-[80px] w-full object-contain transition duration-300 ease-out group-hover:scale-110 group-hover:opacity-90"
                            />
                            <Image
                              src={airline.logoDarkUrl || airline.logoUrl || ""}
                              alt={airline.name}
                              width={160}
                              height={80}
                              sizes="(min-width: 1024px) 160px, 120px"
                              className="logo-dark h-[80px] w-full object-contain transition duration-300 ease-out group-hover:scale-110 group-hover:opacity-90"
                            />
                      </>
                    ) : (
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition duration-300 ease-out group-hover:text-[color:var(--text-primary)]">
                        {airline.icao}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        {testimonials.length > 0 ? (
          <section className="space-y-6">
            <AnimatedTestimonials testimonials={testimonials} />
          </section>
        ) : null}
      </section>
      </div>
    </main>
  );
}
