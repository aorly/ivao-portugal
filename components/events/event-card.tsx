import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type EventCardProps = {
  locale: Locale;
  showStatus?: boolean;
  showLastUpdated?: boolean;
  variant?: "featured" | "compact";
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
    bannerUrl?: string | null;
    registrations?: Array<{ name: string; avatarUrl: string | null }>;
    registrationsCount?: number;
    isPublished?: boolean;
    updatedAt?: string | Date;
  };
};

export async function EventCard({ locale, event, showStatus, showLastUpdated, variant }: EventCardProps) {
  const t = await getTranslations({ locale, namespace: "events" });
  const toDateOrNull = (value: string | Date | null | undefined) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const startDate = toDateOrNull(event.startTime);
  const endDate = toDateOrNull(event.endTime);
  const startIso = startDate ? startDate.toISOString() : null;
  const endIso = endDate ? endDate.toISOString() : null;
  const start = startDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(startDate)
    : "TBD";
  const end = endDate
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(endDate)
    : "TBD";
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
  const updatedAtDate = toDateOrNull(event.updatedAt);
  const updatedLabel =
    updatedAtDate && !Number.isNaN(updatedAtDate.getTime())
      ? updatedAtDate.toLocaleDateString(locale)
      : null;
  const updatedIso = updatedAtDate ? updatedAtDate.toISOString() : null;
  const bannerUrl = event.bannerUrl || "/frontpic.png";
  const isCompact = variant === "compact";
  const detailsHref = `/${locale}/events/${event.slug}`;
  const registrations = event.registrations ?? [];
  const registrationsCount = event.registrationsCount ?? registrations.length;
  const visibleRegistrations = registrations.slice(0, 3);
  const remainingRegistrations = Math.max(registrationsCount - visibleRegistrations.length, 0);
  const initialsFor = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <Card
      className={[
        "relative overflow-hidden border border-[#2B3860] bg-[#111A35]/80 shadow-[0_18px_45px_rgba(8,14,36,0.35)]",
        isCompact ? "min-h-[140px]" : "min-h-[320px]",
      ].join(" ")}
    >
      <div className="absolute inset-0">
        <img src={bannerUrl} alt={`${event.title} banner`} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1024]/85 via-[#0b1024]/40 to-[#0b1024]/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1024]/70 via-transparent to-transparent" />
      </div>

      {!isCompact ? (
        <Link
          href={detailsHref}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white/80 transition hover:bg-white/20"
          aria-label={t("viewDetails")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ) : null}
      <div className={["relative flex h-full flex-col justify-end gap-3", isCompact ? "p-4" : "p-6"].join(" ")}>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">{locationLine}</p>
          <h3 className={isCompact ? "text-base font-semibold text-white" : "text-xl font-semibold text-white"}>
            {event.title}
          </h3>
          <p className={isCompact ? "text-[11px] text-white/70" : "text-xs text-white/70"}>
            {startIso ? <time dateTime={startIso}>{start}</time> : start} - {endIso ? <time dateTime={endIso}>{end}</time> : end}
          </p>
        </div>

        {showStatus && event.isPublished === false ? (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/80">
              Draft
            </span>
          </div>
        ) : null}
        {showLastUpdated && updatedLabel && updatedIso ? (
          <p className="text-[11px] text-white/60">
            Last updated <time dateTime={updatedIso}>{updatedLabel}</time>
          </p>
        ) : null}

        {!isCompact && (event.firs?.length || metaTags.length) ? (
          <div className="flex flex-wrap gap-2 text-[11px] text-white/70">
            {event.firs?.map((fir) => (
              <span key={fir} className="rounded-full bg-white/10 px-2 py-1">
                {fir}
              </span>
            ))}
            {metaTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {!isCompact && registrationsCount > 0 ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
            <div className="flex -space-x-2">
              {visibleRegistrations.map((reg) => (
                <span
                  key={`${event.id}-${reg.name}`}
                  className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-[#131B36] text-[10px] font-semibold text-white"
                >
                  {reg.avatarUrl ? (
                    <img src={reg.avatarUrl} alt={reg.name} className="h-full w-full object-cover" />
                  ) : (
                    initialsFor(reg.name)
                  )}
                </span>
              ))}
              {remainingRegistrations > 0 ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/40 bg-[#202C51] text-[10px] font-semibold text-white">
                  +{remainingRegistrations}
                </span>
              ) : null}
            </div>
            <span>{t("participatingCount", { count: registrationsCount })}</span>
          </div>
        ) : null}

        {!isCompact ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={detailsHref}>
              <Button
                size="sm"
                variant="secondary"
                data-analytics="cta"
                data-analytics-label={`View event ${event.slug}`}
                data-analytics-href={detailsHref}
                className="rounded-full bg-[#1C2648] text-white hover:bg-[#25315b]"
              >
                {t("viewDetails")}
              </Button>
            </Link>
            {event.infoUrl ? (
              <a
                href={event.infoUrl}
                className="rounded-full bg-[#2B3860] px-4 py-1 text-xs font-semibold text-white transition hover:bg-[#364574]"
                target="_blank"
                rel="noreferrer"
              >
                {t("joinEvent")}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
