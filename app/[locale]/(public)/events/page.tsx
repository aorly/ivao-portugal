import { getTranslations } from "next-intl/server";
import { EventCard } from "@/components/events/event-card";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const now = new Date();
  const events = await prisma.event.findMany({
    orderBy: { startTime: "asc" },
    include: {
      registrations: {
        select: { userId: true },
      },
      airports: {
        select: { icao: true },
      },
      firs: {
        select: { slug: true },
      },
    },
  });

  const upcoming = events.filter((e) => e.startTime >= now);
  const past = events.filter((e) => e.startTime < now);

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader title={t("title")} description={t("description")} />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          {t("live")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("sampleDescription")}</p>
          ) : (
            upcoming.map((event) => (
              <EventCard
                key={event.id}
                locale={locale}
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  airports: event.airports.map((a) => a.icao),
                  firs: event.firs.map((f) => f.slug),
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
            <p className="text-sm text-[color:var(--text-muted)]">{t("sampleDescription")}</p>
          ) : (
            past.map((event) => (
              <EventCard
                key={event.id}
                locale={locale}
                event={{
                  id: event.id,
                  slug: event.slug,
                  title: event.title,
                  startTime: event.startTime,
                  endTime: event.endTime,
                  airports: event.airports.map((a) => a.icao),
                  firs: event.firs.map((f) => f.slug),
                }}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
