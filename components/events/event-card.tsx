import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type EventCardProps = {
  locale: Locale;
  event: {
    id: string;
    slug: string;
    title: string;
    startTime: Date;
    endTime: Date;
    airports?: string[];
    firs?: string[];
    isRegistered?: boolean;
  };
};

export async function EventCard({ locale, event }: EventCardProps) {
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

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {event.airports?.join(", ") || "LPxx"}
          </p>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">{event.title}</h3>
          <p className="text-xs text-[color:var(--text-muted)]">
            {t("starts")}: {start} · {t("ends")}: {end}
          </p>
        </div>
        <Link href={`/${locale}/events/${event.slug}`}>
          <Button size="sm" variant="secondary">
            {t("viewDetails")}
          </Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
        {event.firs?.map((fir) => (
          <span key={fir} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">
            {fir}
          </span>
        ))}
      </div>
    </Card>
  );
}
