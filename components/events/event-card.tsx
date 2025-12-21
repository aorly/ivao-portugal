import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type EventCardProps = {
  locale: Locale;
  showStatus?: boolean;
  showLastUpdated?: boolean;
  event: {
    id: string;
    slug: string;
    title: string;
    startTime: Date;
    endTime: Date;
    airports?: string[];
    firs?: string[];
    isRegistered?: boolean;
    eventType?: string | null;
    divisions?: string | null;
    hqeAward?: boolean;
    infoUrl?: string | null;
    isPublished?: boolean;
    updatedAt?: string | Date;
  };
};

export async function EventCard({ locale, event, showStatus, showLastUpdated }: EventCardProps) {
  const t = await getTranslations({ locale, namespace: "events" });
  const start = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.startTime);
  const end = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.endTime);
  const divisions = (() => {
    if (!event.divisions) return [];
    try {
      const parsed = JSON.parse(event.divisions);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).toUpperCase()).filter(Boolean);
    } catch {
      // fall through
    }
    return event.divisions
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  })();
  const locationLine =
    event.airports?.length ? event.airports.join(", ") : event.firs?.length ? event.firs.join(", ") : "Portugal";
  const metaTags = [
    event.eventType ?? null,
    event.hqeAward ? "HQE Award" : null,
    ...divisions.map((d) => `DIV ${d}`),
  ].filter((item): item is string => Boolean(item));
  const updatedAtDate =
    event.updatedAt instanceof Date ? event.updatedAt : event.updatedAt ? new Date(event.updatedAt) : null;
  const updatedLabel =
    updatedAtDate && !Number.isNaN(updatedAtDate.getTime())
      ? updatedAtDate.toLocaleDateString(locale)
      : null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {locationLine}
          </p>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">{event.title}</h3>
          <p className="text-xs text-[color:var(--text-muted)]">
            {t("starts")}: {start} | {t("ends")}: {end}
          </p>
        </div>
        <Link href={`/${locale}/events/${event.slug}`}>
          <Button size="sm" variant="secondary">
            {t("viewDetails")}
          </Button>
        </Link>
      </div>
      {showStatus && event.isPublished === false ? (
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
          <span className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
            Draft
          </span>
        </div>
      ) : null}
      {showLastUpdated && updatedLabel ? (
        <p className="text-[11px] text-[color:var(--text-muted)]">Last updated {updatedLabel}</p>
      ) : null}
      {event.firs?.length || metaTags.length ? (
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
          {event.firs?.map((fir) => (
            <span key={fir} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">
              {fir}
            </span>
          ))}
          {metaTags.map((tag) => (
            <span key={tag} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
