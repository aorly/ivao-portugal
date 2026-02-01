"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type React from "react";
import { Card } from "@/components/ui/card";

type CreatorLink = {
  type: string;
  url: string;
};

type Creator = {
  id: string;
  name: string;
  tier?: number | null;
  links: CreatorLink[];
  isLive?: boolean;
  livePlatform?: string | null;
  liveUrl?: string | null;
  bannerUrl?: string | null;
};

const linkLabels: Record<string, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
  tiktok: "TikTok",
  instagram: "Instagram",
  twitter: "X",
  x: "X",
};

const iconFor = (type: string) => {
  const key = type.toLowerCase();
  if (key === "youtube") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M4 7.5c.2-1.2 1.1-2.1 2.3-2.3C8 4.9 12 4.9 12 4.9s4 0 5.7.3c1.2.2 2.1 1.1 2.3 2.3.2 1.3.2 4 .2 4s0 2.7-.2 4c-.2 1.2-1.1 2.1-2.3 2.3-1.7.3-5.7.3-5.7.3s-4 0-5.7-.3c-1.2-.2-2.1-1.1-2.3-2.3-.2-1.3-.2-4-.2-4s0-2.7.2-4Z"
          fill="currentColor"
        />
        <path d="M10 9.5 15 12 10 14.5z" fill="var(--surface)" />
      </svg>
    );
  }
  if (key === "twitch") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M4 3h16v10l-4 4h-4l-2 2H7v-2H4z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M13 7v4M17 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (key === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M15 4c.6 1.7 2.1 3.1 4 3.5V11c-1.6-.1-3.1-.7-4.3-1.7v5.9a4.7 4.7 0 1 1-4.7-4.7c.4 0 .9.1 1.3.2v3.1a1.6 1.6 0 1 0 1.2 1.5V4h2.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 16 0A8 8 0 0 0 4 12Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

const labelFor = (type: string) => linkLabels[type.toLowerCase()] ?? type;

export function CreatorsCarousel({ creators }: { creators: Creator[] }) {
  const [failed, setFailed] = useState<Record<string, true>>({});
  const bannerById = useMemo(
    () =>
      creators.reduce<Record<string, string>>((acc, creator) => {
        if (creator.bannerUrl) acc[creator.id] = creator.bannerUrl;
        return acc;
      }, {}),
    [creators],
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScroll: 0 });

  if (creators.length === 0) return null;
  const onDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = scrollRef.current;
    if (!target) return;
    setDragging(true);
    dragState.current = {
      startX: event.pageX - target.offsetLeft,
      startScroll: target.scrollLeft,
    };
  };

  const onDragMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const target = scrollRef.current;
    if (!target) return;
    event.preventDefault();
    const x = event.pageX - target.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.2;
    target.scrollLeft = dragState.current.startScroll - walk;
  };

  const onDragEnd = () => {
    setDragging(false);
  };

  return (
    <div
      ref={scrollRef}
      className={`relative -mx-6 cursor-grab overflow-x-auto px-6 pb-8 scrollbar-none select-none ${dragging ? "cursor-grabbing" : ""}`}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[color:var(--background)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[color:var(--background)] to-transparent" />
      <div className="flex snap-x snap-mandatory gap-6">
        {creators.map((creator) => (
          <Card
            key={creator.id}
            className={`group relative h-64 w-[280px] shrink-0 snap-center overflow-hidden rounded-[24px] border bg-[color:var(--surface)] p-0 shadow-[0_20px_60px_rgba(15,27,68,0.16)] transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,27,68,0.2)] ${
              creator.isLive ? "border-[color:var(--danger)]/70" : "border-[color:var(--border)]"
            } sm:w-[320px]`}
          >
            <div className="absolute inset-0">
              {bannerById[creator.id] && !failed[creator.id] ? (
                <Image
                  src={bannerById[creator.id]}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 320px, 280px"
                  className="object-cover"
                  onError={() => setFailed((prev) => ({ ...prev, [creator.id]: true }))}
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,rgba(44,107,216,0.32),rgba(13,44,153,0.2))]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,27,0.15),rgba(8,12,27,0.78))]" />
            </div>

            <div className="relative flex h-full flex-col justify-between p-5 text-white">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <span>Creator</span>
                {creator.tier ? (
                  <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold text-white/80">
                    Tier {creator.tier}
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-semibold text-white">{creator.name}</p>
                  {creator.isLive ? (
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[color:var(--danger)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      <span className="h-2 w-2 rounded-full bg-white/90" />
                      Live now
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {creator.links.map((link) => (
                    <a
                      key={`${creator.id}-${link.type}`}
                      href={creator.isLive ? creator.liveUrl ?? link.url : link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
                      aria-label={`${creator.name} on ${labelFor(link.type)}`}
                    >
                      {iconFor(link.type)}
                      {labelFor(link.type)}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
