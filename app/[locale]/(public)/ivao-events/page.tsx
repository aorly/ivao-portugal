import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ivaoClient } from "@/lib/ivaoClient";
import { normalizeIvaoEvents, type IvaoEvent } from "@/lib/ivao-events";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const formatDate = (locale: string, value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
};

const getIvaoEvents = unstable_cache(
  async () => {
    const payload = await ivaoClient.getEvents().catch(() => []);
    return normalizeIvaoEvents(payload);
  },
  ["ivao-events"],
  { revalidate: 300 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ivaoEvents" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: absoluteUrl(`/${locale}/ivao-events`) },
  };
}

export default async function IvaoEventsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ivaoEvents" });
  const events = await getIvaoEvents();
  const now = new Date();

  const upcoming = events
    .filter((event) => event.startTime && new Date(event.startTime) >= now)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  const past = events
    .filter((event) => event.startTime && new Date(event.startTime) < now)
    .sort((a, b) => (b.startTime ?? "").localeCompare(a.startTime ?? ""));

  const renderEvent = (event: IvaoEvent) => {
    const start = formatDate(locale, event.startTime);
    const end = formatDate(locale, event.endTime);
    const timeLabel = start && end ? `${start} - ${end}` : start ?? t("timeTbd");
    const banner = event.bannerUrl || "/frontpic.png";
    const detailHref = `/${locale}/ivao-events/${encodeURIComponent(event.id)}`;
    const divisions = event.divisions.map((division) => division.toUpperCase());

    return (
      <Card
        key={event.id}
        className="group relative overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow-soft)]"
      >
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={banner}
            alt={event.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            quality={60}
          />
          <div className="absolute inset-0 bg-[color:var(--primary-soft)] mix-blend-multiply" />
          <div className="absolute left-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--text-primary)]">
            IVAO
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{timeLabel}</p>
            <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{event.title}</h2>
            {event.airports.length ? (
              <p className="text-xs text-[color:var(--text-muted)]">
                {t("airportsLabel")}: {event.airports.join(", ")}
              </p>
            ) : null}
            {divisions.length ? (
              <p className="text-xs text-[color:var(--text-muted)]">
                {t("divisionsLabel")}: {divisions.join(", ")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={detailHref}>
              <Button size="sm" variant="secondary" className="rounded-full">
                {t("viewDetails")}
              </Button>
            </Link>
            {event.externalUrl ? (
              <a href={event.externalUrl} target="_blank" rel="noreferrer">
                <Button size="sm" className="rounded-full">
                  {t("openIvao")}
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 text-[color:var(--text-primary)]">
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{t("eyebrow")}</p>
            <h1 className="text-3xl font-bold">{t("title")}</h1>
          </div>
          <p className="max-w-2xl text-sm text-[color:var(--text-muted)] sm:text-base">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://ivao.events" target="_blank" rel="noreferrer">
              <Button size="sm" variant="secondary" className="rounded-full">
                {t("viewOfficial")}
              </Button>
            </a>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("upcomingHeading")}</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("emptyUpcoming")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {upcoming.map(renderEvent)}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("pastHeading")}</h2>
          {past.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("emptyPast")}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {past.map(renderEvent)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
