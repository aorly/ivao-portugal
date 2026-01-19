import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ivaoClient } from "@/lib/ivaoClient";
import { normalizeIvaoEvents, type IvaoEvent } from "@/lib/ivao-events";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

const getIvaoEvents = unstable_cache(
  async () => {
    const payload = await ivaoClient.getEvents().catch(() => []);
    return normalizeIvaoEvents(payload);
  },
  ["ivao-events"],
  { revalidate: 300 },
);

const formatDate = (locale: string, value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
};

const renderDescription = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const looksLikeHtml = /<\w+[^>]*>/.test(trimmed);
  if (looksLikeHtml) {
    return (
      <div
        className="prose max-w-none text-sm text-[color:var(--text-muted)]"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  const paragraphs = trimmed.split(/\n+/).filter((p) => p.trim().length > 0);
  return (
    <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
      {paragraphs.map((text, idx) => (
        <p key={idx}>{text}</p>
      ))}
    </div>
  );
};

const getEventById = (events: IvaoEvent[], id: string) =>
  events.find((event) => event.id === id) ?? null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const events = await getIvaoEvents();
  const event = getEventById(events, id);
  if (!event) {
    return {
      title: "IVAO event",
      robots: { index: false, follow: false },
    };
  }
  const description = event.description?.slice(0, 160) ?? "IVAO event details.";
  const canonical = absoluteUrl(`/${locale}/ivao-events/${encodeURIComponent(event.id)}`);
  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: event.title,
      description,
      url: canonical,
      images: event.bannerUrl ? [{ url: event.bannerUrl }] : undefined,
    },
  };
}

export default async function IvaoEventDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "ivaoEvents" });
  const events = await getIvaoEvents();
  const event = getEventById(events, id);

  if (!event) {
    notFound();
  }

  const start = formatDate(locale, event.startTime);
  const end = formatDate(locale, event.endTime);
  const timeLabel = start && end ? `${start} - ${end}` : start ?? t("timeTbd");
  const banner = event.bannerUrl || "/frontpic.png";
  const divisions = event.divisions.map((division) => division.toUpperCase());

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-[color:var(--text-primary)]">
        <section className="space-y-4">
          <Link href={`/${locale}/ivao-events`} className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
            {t("backToEvents")}
          </Link>
          <Card className="overflow-hidden p-0">
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner} alt={event.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/45" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/80">{timeLabel}</p>
                <h1 className="mt-2 text-2xl font-semibold">{event.title}</h1>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card className="space-y-4 p-5">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("overviewTitle")}</p>
            {renderDescription(event.description) ?? (
              <p className="text-sm text-[color:var(--text-muted)]">{t("emptyDescription")}</p>
            )}
          </Card>
          <Card className="space-y-4 p-5">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("detailsTitle")}</p>
            <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("timeLabel")}</span>
                <span className="text-[color:var(--text-primary)]">{timeLabel}</span>
              </div>
              {event.airports.length ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("airportsLabel")}</p>
                  <p className="text-[color:var(--text-primary)]">{event.airports.join(", ")}</p>
                </div>
              ) : null}
              {divisions.length ? (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("divisionsLabel")}</p>
                  <p className="text-[color:var(--text-primary)]">{divisions.join(", ")}</p>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {event.externalUrl ? (
                <a href={event.externalUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="rounded-full">
                    {t("openIvao")}
                  </Button>
                </a>
              ) : null}
              <Link href={`/${locale}/events`}>
                <Button size="sm" variant="secondary" className="rounded-full">
                  {t("localEvents")}
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}
