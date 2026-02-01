"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { HeroSlider } from "@/components/public/hero-slider";

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

type Props = {
  slides: Slide[];
  locale: string;
};

type MeResponse = {
  user?: { name?: string | null } | null;
};

export function HomeHeroClient({ slides, locale }: Props) {
  const t = useTranslations("home");
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: MeResponse | null) => {
        if (!isMounted) return;
        const name = data?.user?.name?.trim() ?? "";
        setUserName(name || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setUserName(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthed = Boolean(userName);
  const firstName = (userName ?? "").split(" ")[0] || "there";
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/home`)}`;

  const fallbackCtas = isAuthed
    ? [
        { label: t("ctaDashboard"), href: `/${locale}/profile`, variant: "primary" as const },
        { label: t("ctaEvents"), href: `/${locale}/events`, variant: "secondary" as const },
      ]
    : [
        { label: t("ctaJoin"), href: loginUrl, variant: "primary" as const },
        { label: t("ctaEvents"), href: `/${locale}/events`, variant: "secondary" as const },
        { label: t("ctaTours"), href: "https://events.pt.ivao.aero/", variant: "secondary" as const },
      ];

  const resolvedSlides = useMemo(() => {
    if (slides.length > 0) return slides;
    return [
      {
        id: "fallback",
        eyebrow: t("badge"),
        title: isAuthed ? t("signedInTitle", { name: firstName }) : t("title"),
        subtitle: isAuthed ? t("signedInSubtitle") : t("subtitle"),
        imageUrl: null,
        imageAlt: null,
        ctaLabel: null,
        ctaHref: null,
        secondaryLabel: null,
        secondaryHref: null,
        fullWidth: false,
      },
    ];
  }, [slides, isAuthed, firstName, t]);

  return <HeroSlider slides={resolvedSlides} fallbackCtas={fallbackCtas} />;
}
