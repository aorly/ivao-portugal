"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";

type Airline = {
  icao: string;
  name: string;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
};

type Props = {
  locale: string;
  airlines: Airline[];
};

export function AirlinesCarousel({ locale, airlines }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef({ startX: 0, startScroll: 0 });

  if (airlines.length === 0) return null;
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

  const onDragEnd = () => setDragging(false);

  return (
    <div
      ref={scrollRef}
      className={`relative -mx-6 cursor-grab overflow-x-auto px-6 pb-6 scrollbar-none select-none ${
        dragging ? "cursor-grabbing" : ""
      }`}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[color:var(--background)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[color:var(--background)] to-transparent" />
      <div className="flex snap-x snap-mandatory gap-4">
        {airlines.map((airline) => {
          const lightLogo = airline.logoUrl || airline.logoDarkUrl;
          const darkLogo = airline.logoDarkUrl || airline.logoUrl;
          return (
            <Link key={airline.icao} href={`/${locale}/airlines/${airline.icao}`}>
              <Card className="group flex h-28 w-[220px] shrink-0 snap-center items-center gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                  {lightLogo ? (
                    <>
                      <Image
                        src={lightLogo}
                        alt=""
                        width={40}
                        height={40}
                        className="logo-light h-10 w-10 object-contain"
                        unoptimized
                      />
                      <Image
                        src={darkLogo ?? lightLogo}
                        alt=""
                        width={40}
                        height={40}
                        className="logo-dark h-10 w-10 object-contain"
                        unoptimized
                      />
                    </>
                  ) : (
                    <span className="text-[10px] text-[color:var(--text-muted)]">Logo</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{airline.icao}</p>
                  <p className="truncate text-sm font-semibold text-[color:var(--text-primary)]">{airline.name}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
