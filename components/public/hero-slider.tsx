"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Slide = {
  id: string;
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  fullWidth?: boolean | null;
};

type Cta = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

type Props = {
  slides: Slide[];
  fallbackCtas?: Cta[];
  autoMs?: number;
};

const isExternalHref = (href: string) => /^https?:\/\//i.test(href);

export function HeroSlider({ slides, fallbackCtas = [], autoMs = 8000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const preparedSlides = useMemo(() => {
    return slides.map((slide) => {
      const primary =
        slide.ctaLabel && slide.ctaHref ? { label: slide.ctaLabel, href: slide.ctaHref, variant: "primary" as const } : fallbackCtas[0];
      const secondary =
        slide.secondaryLabel && slide.secondaryHref
          ? { label: slide.secondaryLabel, href: slide.secondaryHref, variant: "secondary" as const }
          : fallbackCtas[1];
      const rest = fallbackCtas.slice(2);
      return {
        ...slide,
        ctas: [primary, secondary, ...rest].filter(Boolean) as Cta[],
      };
    });
  }, [slides, fallbackCtas]);

  useEffect(() => {
    if (preparedSlides.length <= 1 || paused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % preparedSlides.length);
    }, autoMs);
    return () => clearInterval(interval);
  }, [preparedSlides.length, paused, autoMs]);

  const goTo = (nextIndex: number) => {
    const total = preparedSlides.length;
    if (!total) return;
    setIndex((nextIndex + total) % total);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {preparedSlides.map((slide) => (
            <div key={slide.id} className="w-full shrink-0">
              <div
                className={`relative ${
                  slide.fullWidth ? "min-h-[320px] sm:min-h-[380px] lg:min-h-[440px]" : ""
                }`}
              >
                {slide.fullWidth && slide.imageUrl ? (
                  <img
                    src={slide.imageUrl}
                    alt={slide.imageAlt ?? slide.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ) : null}
                {slide.fullWidth ? (
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--surface)_0%,rgba(255,255,255,0.55)_45%,transparent_75%)]" />
                ) : null}
                <div
                  className={`relative grid gap-8 p-10 lg:p-14 ${
                    slide.fullWidth ? "lg:grid-cols-1" : "lg:grid-cols-[1.1fr_0.9fr]"
                  }`}
                >
                  <div className={`space-y-6 ${slide.fullWidth ? "max-w-2xl" : "lg:pr-6"}`}>
                    {slide.eyebrow ? (
                      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--text-muted)]">
                        {slide.eyebrow}
                      </p>
                    ) : null}
                    <div className="space-y-4">
                      <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{slide.title}</h1>
                      {slide.subtitle ? (
                        <p className="max-w-xl text-base text-[color:var(--text-muted)] sm:text-lg">{slide.subtitle}</p>
                      ) : null}
                    </div>
                    {slide.ctas.length ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {slide.ctas.map((cta, ctaIndex) => {
                          const variant = cta.variant ?? (ctaIndex === 0 ? "primary" : "secondary");
                          const isExternal = isExternalHref(cta.href);
                          if (isExternal) {
                            return (
                              <a key={`${slide.id}-${cta.label}`} href={cta.href} target="_blank" rel="noreferrer">
                                <Button
                                  variant={variant === "primary" ? undefined : variant === "ghost" ? "ghost" : "secondary"}
                                  className={
                                    variant === "secondary"
                                      ? "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                                      : undefined
                                  }
                                >
                                  {cta.label}
                                </Button>
                              </a>
                            );
                          }
                          return (
                            <Link key={`${slide.id}-${cta.label}`} href={cta.href}>
                              <Button
                                variant={variant === "primary" ? undefined : variant === "ghost" ? "ghost" : "secondary"}
                                className={
                                  variant === "secondary"
                                    ? "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                                    : undefined
                                }
                              >
                                {cta.label}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  {!slide.fullWidth ? (
                    <div className="relative min-h-[240px] overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)]/60 sm:min-h-[280px] lg:min-h-[320px]">
                      {slide.imageUrl ? (
                        <img
                          src={slide.imageUrl}
                          alt={slide.imageAlt ?? slide.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading={index === 0 ? "eager" : "lazy"}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(13,44,153,0.2),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(249,204,44,0.25),transparent_60%)]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-[rgba(10,17,43,0.05)] via-transparent to-[rgba(13,44,153,0.18)]" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {preparedSlides.length > 1 ? (
        <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2">
          {preparedSlides.map((slide, dotIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Go to slide ${dotIndex + 1}`}
              onClick={() => goTo(dotIndex)}
              className={`pointer-events-auto h-2.5 w-2.5 rounded-full transition ${
                dotIndex === index ? "bg-[color:var(--primary)]" : "bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
