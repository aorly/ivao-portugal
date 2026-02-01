"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, useRef, useState } from "react";

type EventCard = {
  id: string;
  title: string;
  location: string;
  bannerUrl: string;
  href: string;
  isExternal: boolean;
};

type Props = {
  events: EventCard[];
  locale: string;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export function EventsSlider({ events, locale }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScroll: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const rafRef = useRef<number | null>(null);

  if (events.length === 0) return null;

  const onDragStart = (event: MouseEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target) return;
    setDragging(true);
    dragState.current = {
      startX: event.pageX - target.offsetLeft,
      startScroll: target.scrollLeft,
    };
  };

  const onDragMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const target = scrollRef.current;
    if (!target) return;
    event.preventDefault();
    const x = event.pageX - target.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.2;
    target.scrollLeft = dragState.current.startScroll - walk;
  };

  const onDragEnd = () => setDragging(false);

  const getCardMetrics = () => {
    const target = scrollRef.current;
    if (!target) return { cardWidth: 0, gap: 0 };
    const card = target.querySelector<HTMLDivElement>("[data-event-card]");
    const cardWidth = card?.offsetWidth ?? 0;
    const gap = 20;
    return { cardWidth, gap };
  };

  const scrollToIndex = (index: number) => {
    const target = scrollRef.current;
    if (!target) return;
    const { cardWidth, gap } = getCardMetrics();
    if (!cardWidth) return;
    target.scrollTo({
      left: (cardWidth + gap) * index,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div
      ref={scrollRef}
      className={`relative -mx-4 cursor-grab overflow-x-auto px-4 pb-4 scrollbar-none select-none sm:-mx-6 sm:px-6 ${
        dragging ? "cursor-grabbing" : ""
      }`}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      aria-label={`Events slider for ${locale}`}
      onScroll={() => {
        if (rafRef.current) return;
        rafRef.current = window.requestAnimationFrame(() => {
          const target = scrollRef.current;
          if (!target) return;
          const { cardWidth, gap } = getCardMetrics();
          if (!cardWidth) return;
          const index = Math.round(target.scrollLeft / (cardWidth + gap));
          setActiveIndex(Math.max(0, Math.min(events.length - 1, index)));
          rafRef.current = null;
        });
      }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[color:var(--background)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[color:var(--background)] to-transparent" />
      <div className="flex snap-x snap-mandatory gap-5">
        {events.map((event, idx) => {
          const card = (
            <article
              data-event-card
              className="group relative flex h-56 w-[280px] shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[26px] bg-[color:var(--surface)] shadow-[var(--shadow-soft)] sm:h-64 sm:w-[360px]"
            >
              <Image
                src={event.bannerUrl}
                alt={event.title}
                fill
                sizes="(min-width: 640px) 360px, 280px"
                className="absolute inset-0 object-cover"
                priority={idx === 0}
                quality={60}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[rgba(7,14,36,0.25)] via-[rgba(7,14,36,0.55)] to-[rgba(7,14,36,0.85)]" />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(13,44,153,0.35),rgba(13,44,153,0))]" />
              <div className="relative flex h-full flex-col gap-3 p-5 text-white">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">Event</p>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold leading-tight">{event.title}</h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">{event.location}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold text-white/85">
                  View briefing <span aria-hidden="true">→</span>
                </span>
              </div>
            </article>
          );

          return event.isExternal ? (
            <a key={event.id} href={event.href} target="_blank" rel="noreferrer">
              {card}
            </a>
          ) : (
            <Link key={event.id} href={event.href}>
              {card}
            </Link>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2">
        {events.map((event, index) => (
          <button
            key={`${event.id}-dot`}
            type="button"
            onClick={() => scrollToIndex(index)}
            className={`pointer-events-auto h-2 w-2 rounded-full transition ${
              index === activeIndex ? "bg-[color:var(--primary)]" : "bg-[color:var(--border)]"
            }`}
            aria-label={`Go to event ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

