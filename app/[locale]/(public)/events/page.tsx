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

type Props = {
  params: Promise<{ locale: Locale }>;
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

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const session = await auth();
  const isStaff = session?.user && session.user.role !== "USER";
  const now = new Date();
  const fetchPublishedEvents = unstable_cache(
    async () =>
      prisma.event.findMany({
        where: { isPublished: true },
        orderBy: { startTime: "asc" },
        include: {
          airports: {
            select: { icao: true },
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
            select: { icao: true },
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
  const lastUpdated = events.length
    ? new Date(Math.max(...events.map((event) => new Date(event.updatedAt).getTime())))
    : null;

  const upcoming = events.filter((e) => e.startTime >= now);
  const past = events.filter((e) => e.startTime < now);

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        title={t("title")}
        description={t("description")}
        action={
          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
            <Badge>{isStaff ? "Published + Drafts" : "Published"}</Badge>
            {lastUpdated ? <span>Last updated {lastUpdated.toLocaleDateString(locale)}</span> : null}
          </div>
        }
      />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          {t("live")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("emptyUpcoming")}</p>
          ) : (
            upcoming.map((event) => (
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
          {past.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("emptyPast")}</p>
          ) : (
            past.map((event) => (
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
