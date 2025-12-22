import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { EventCard } from "@/components/events/event-card";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { EventsFilters } from "@/components/events/events-filters";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/events`) },
  };
}

export default async function EventsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const session = await auth();
  const isStaff = session?.user && session.user.role !== "USER";
  const now = new Date();
  const toDateOrNull = (value: string | Date | null | undefined) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const fetchPublishedEvents = unstable_cache(
    async () =>
      prisma.event.findMany({
        where: { isPublished: true },
        orderBy: { startTime: "asc" },
        include: {
          airports: {
            select: { icao: true, latitude: true, longitude: true, fir: { select: { slug: true } } },
          },
          firs: {
            select: { slug: true },
          },
        },
      }),
    ["public-events"],
    { revalidate: 300 },
  );
  const fetchAllEvents = unstable_cache(
    async () =>
      prisma.event.findMany({
        orderBy: { startTime: "asc" },
        include: {
          airports: {
            select: { icao: true, latitude: true, longitude: true, fir: { select: { slug: true } } },
          },
          firs: {
            select: { slug: true },
          },
        },
      }),
    ["public-events-staff"],
    { revalidate: 300 },
  );
  const events = await (isStaff ? fetchAllEvents() : fetchPublishedEvents());
  const updatedTimestamps = events
    .map((event) => toDateOrNull(event.updatedAt)?.getTime() ?? 0)
    .filter((value) => value > 0);
  const lastUpdated = updatedTimestamps.length ? new Date(Math.max(...updatedTimestamps)) : null;
  const lastUpdatedIso = lastUpdated ? lastUpdated.toISOString() : null;

  const getParam = (key: string) => {
    const value = searchParams?.[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };

  const selectedRegion = getParam("region");
  const selectedFir = getParam("fir");
  const selectedDivision = getParam("division");
  const selectedType = getParam("type");

  const parseDivisions = (value?: string | null) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).toUpperCase()).filter(Boolean);
    } catch {
      // fall through
    }
    return value
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  };

  const regionBounds = {
    mainland: { minLon: -9.5005, maxLon: -6.1891, minLat: 36.9626, maxLat: 42.1543 },
    azores: { minLon: -31.2682, maxLon: -25.0151, minLat: 36.9282, maxLat: 39.7248 },
    madeira: { minLon: -17.2658, maxLon: -16.2925, minLat: 32.4158, maxLat: 33.0971 },
  };
  const isInBounds = (
    lon: number,
    lat: number,
    bounds: { minLon: number; maxLon: number; minLat: number; maxLat: number },
  ) => lon >= bounds.minLon && lon <= bounds.maxLon && lat >= bounds.minLat && lat <= bounds.maxLat;

  const getRegions = (event: (typeof events)[number]) => {
    const regions = new Set<string>();
    event.airports.forEach((airport) => {
      if (typeof airport.latitude !== "number" || typeof airport.longitude !== "number") return;
      if (isInBounds(airport.longitude, airport.latitude, regionBounds.mainland)) regions.add("mainland");
      if (isInBounds(airport.longitude, airport.latitude, regionBounds.azores)) regions.add("azores");
      if (isInBounds(airport.longitude, airport.latitude, regionBounds.madeira)) regions.add("madeira");
    });
    return Array.from(regions);
  };

  const getEventFirs = (event: (typeof events)[number]) => {
    const firs = new Set<string>();
    event.firs.forEach((fir) => firs.add(fir.slug.toUpperCase()));
    event.airports.forEach((airport) => {
      if (airport.fir?.slug) firs.add(airport.fir.slug.toUpperCase());
    });
    return Array.from(firs);
  };

  const filteredEvents = events.filter((event) => {
    const regions = getRegions(event);
    const firs = getEventFirs(event);
    const divisions = parseDivisions(event.divisions);
    const type = event.eventType?.trim();

    if (selectedRegion && selectedRegion !== "all") {
      const hasRegion = regions.length > 0 ? regions.includes(selectedRegion) : selectedRegion === "unknown";
      if (!hasRegion) return false;
    }
    if (selectedFir && selectedFir !== "all" && !firs.includes(selectedFir.toUpperCase())) {
      return false;
    }
    if (selectedDivision && selectedDivision !== "all" && !divisions.includes(selectedDivision.toUpperCase())) {
      return false;
    }
    if (selectedType && selectedType !== "all" && type !== selectedType) {
      return false;
    }
    return true;
  });

  const firOptions = Array.from(
    new Set(events.flatMap((event) => getEventFirs(event))),
  ).sort();
  const divisionOptions = Array.from(
    new Set(events.flatMap((event) => parseDivisions(event.divisions))),
  ).sort();
  const typeOptions = Array.from(
    new Set(events.map((event) => event.eventType).filter((type): type is string => Boolean(type))),
  ).sort();
  const regionOptions = [
    { value: "mainland", label: "Mainland" },
    { value: "azores", label: "Azores" },
    { value: "madeira", label: "Madeira" },
    { value: "unknown", label: "Unknown" },
  ];

  const upcoming = events.filter((e) => {
    const start = toDateOrNull(e.startTime);
    return start ? start >= now : false;
  });
  const past = events.filter((e) => {
    const start = toDateOrNull(e.startTime);
    return start ? start < now : false;
  });
  const filteredUpcoming = upcoming.filter((event) => filteredEvents.includes(event));
  const filteredPast = past.filter((event) => filteredEvents.includes(event));

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <Badge>{isStaff ? "Published + Drafts" : "Published"}</Badge>
            {lastUpdated && lastUpdatedIso ? (
              <span>
                Last updated <time dateTime={lastUpdatedIso}>{lastUpdated.toLocaleDateString(locale)}</time>
              </span>
            ) : null}
          </div>
        }
      />

      <EventsFilters
        regions={regionOptions}
        firs={firOptions}
        divisions={divisionOptions}
        types={typeOptions}
        totalCount={events.length}
        filteredCount={filteredEvents.length}
        selected={{
          region: selectedRegion ?? "all",
          fir: selectedFir ?? "all",
          division: selectedDivision ?? "all",
          type: selectedType ?? "all",
        }}
      />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          {t("live")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredUpcoming.length === 0 ? (
            <p role="status" className="text-sm text-[color:var(--text-muted)]">
              {filteredEvents.length === 0 ? "No events match these filters." : t("emptyUpcoming")}
            </p>
          ) : (
            filteredUpcoming.map((event) => (
              <EventCard
                key={event.id}
                locale={locale}
                showStatus={isStaff}
                showLastUpdated
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  airports: event.airports.map((a) => a.icao),
                  firs: event.firs.map((f) => f.slug),
                  eventType: event.eventType,
                  divisions: event.divisions,
                  hqeAward: event.hqeAward,
                  infoUrl: event.infoUrl,
                  isPublished: event.isPublished,
                  updatedAt: event.updatedAt,
                }}
              />
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          {t("past")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPast.length === 0 ? (
            <p role="status" className="text-sm text-[color:var(--text-muted)]">
              {filteredEvents.length === 0 ? "No events match these filters." : t("emptyPast")}
            </p>
          ) : (
            filteredPast.map((event) => (
              <EventCard
                key={event.id}
                locale={locale}
                showStatus={isStaff}
                showLastUpdated
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  airports: event.airports.map((a) => a.icao),
                  firs: event.firs.map((f) => f.slug),
                  eventType: event.eventType,
                  divisions: event.divisions,
                  hqeAward: event.hqeAward,
                  infoUrl: event.infoUrl,
                  isPublished: event.isPublished,
                  updatedAt: event.updatedAt,
                }}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
