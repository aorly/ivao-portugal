import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EventCard } from "@/components/events/event-card";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { auth } from "@/lib/auth";
import { EventsFilters } from "@/components/events/events-filters";
import { EventsRangeSync } from "@/components/events/events-range-sync";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export const dynamic = "force-dynamic";

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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const getParam = (key: string) => {
    const value = resolvedSearchParams?.[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };
  const selectedRange = getParam("range");
  const rawQuery = getParam("q");
  if (!selectedRange) {
    redirect(`/${locale}/events?range=future`);
  }

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
          registrations: {
            take: 4,
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
          _count: { select: { registrations: true } },
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
          registrations: {
            take: 4,
            include: { user: { select: { name: true, avatarUrl: true } } },
          },
          _count: { select: { registrations: true } },
        },
      }),
    ["public-events-staff"],
    { revalidate: 300 },
  );
  const events = await (isStaff ? fetchAllEvents() : fetchPublishedEvents());
  const query = rawQuery ? rawQuery.trim().toLowerCase() : "";
  const matchesQuery = (event: (typeof events)[number]) => {
    if (!query) return true;
    const startDate = toDateOrNull(event.startTime);
    const endDate = toDateOrNull(event.endTime);
    const queryTarget = [
      event.title,
      event.slug,
      event.eventType ?? "",
      event.divisions ?? "",
      ...event.airports.map((airport) => airport.icao),
      ...event.firs.map((fir) => fir.slug),
    ]
      .join(" ")
      .toLowerCase();
    const queryDateStrings = [
      startDate ? startDate.toISOString() : "",
      endDate ? endDate.toISOString() : "",
      startDate ? startDate.toLocaleDateString(locale) : "",
      endDate ? endDate.toLocaleDateString(locale) : "",
      startDate ? startDate.toLocaleString(locale) : "",
      endDate ? endDate.toLocaleString(locale) : "",
    ]
      .join(" ")
      .toLowerCase();
    return queryTarget.includes(query) || queryDateStrings.includes(query);
  };
  const upcoming = events.filter((e) => {
    const start = toDateOrNull(e.startTime);
    return start ? start >= now : false;
  });
  const past = events.filter((e) => {
    const start = toDateOrNull(e.startTime);
    return start ? start < now : false;
  });
  const filteredUpcoming = upcoming.filter(matchesQuery);
  const filteredPast = past.filter(matchesQuery);
  const range = selectedRange === "history" ? "history" : "future";
  const showUpcoming = range !== "history";
  const showPast = range !== "future";

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-white">
        <h1 className="sr-only">{t("title")}</h1>
        <EventsRangeSync locale={locale} />

        <EventsFilters query={query} range={range} />

        {showUpcoming ? (
          <div id="upcoming" className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{t("upcomingHeading")}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {filteredUpcoming.length === 0 ? (
                <p role="status" className="text-sm text-white/60">
                  {t("emptyUpcoming")}
                </p>
              ) : (
                filteredUpcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    locale={locale}
                    showStatus={isStaff}
                    showLastUpdated
                    variant="featured"
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
                      bannerUrl: event.bannerUrl,
                      registrations: event.registrations.map((reg) => ({
                        name: reg.user?.name ?? "IVAO Member",
                        avatarUrl: reg.user?.avatarUrl ?? null,
                      })),
                      registrationsCount: event._count?.registrations ?? event.registrations.length,
                      isPublished: event.isPublished,
                      updatedAt: event.updatedAt,
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}

        {showPast ? (
          <div id="previous" className="space-y-4">
            <h2 className="text-lg font-semibold text-white">{t("previousHeading")}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPast.length === 0 ? (
                <p role="status" className="text-sm text-white/60">
                  {t("emptyPast")}
                </p>
              ) : (
                filteredPast.map((event) => (
                  <EventCard
                    key={event.id}
                    locale={locale}
                    showStatus={isStaff}
                    showLastUpdated
                    variant="compact"
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
                      bannerUrl: event.bannerUrl,
                      registrations: event.registrations.map((reg) => ({
                        name: reg.user?.name ?? "IVAO Member",
                        avatarUrl: reg.user?.avatarUrl ?? null,
                      })),
                      registrationsCount: event._count?.registrations ?? event.registrations.length,
                      isPublished: event.isPublished,
                      updatedAt: event.updatedAt,
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
