"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventCard = {
  id: string;
  title: string;
  bannerUrl: string | null;
  startTime: string;
  eventUrl: string | null;
};

type Props = {
  events: EventCard[];
  locale: string;
};

export function ProfileEventsCarousel({ events, locale }: Props) {
  const items = useMemo(() => events.filter((event) => Boolean(event.startTime)), [events]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Upcoming IVAO events</p>
        <p className="text-sm text-[color:var(--text-muted)]">No upcoming events listed yet.</p>
      </div>
    );
  }

  const active = items[index % items.length];
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(active.startTime));
  const eventHref = active.eventUrl || `/${locale}/events`;
  const isExternal = eventHref.startsWith("http");

  return (
    <div className="relative h-full min-h-[200px] overflow-hidden">
      {active.bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={active.bannerUrl} alt={active.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[color:var(--surface-3)]" />
      )}
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative flex h-full flex-col justify-between p-4 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className="rounded-full bg-white/20 px-2 py-1">IVAO</span>
          <span className="ml-auto text-white/80">{dateLabel}</span>
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold">{active.title}</p>
          <p className="text-xs text-white/80">Upcoming IVAO event</p>
          {isExternal ? (
            <a
              href={eventHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-white underline"
            >
              View event
            </a>
          ) : (
            <Link
              href={eventHref}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white underline"
            >
              View event
            </Link>
          )}
        </div>
      </div>
      {items.length > 1 ? (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`}
                aria-label={`Go to event ${i + 1}`}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
