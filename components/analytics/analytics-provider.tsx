"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView, trackCtaClick } from "@/lib/analytics-client";

type Props = {
  locale?: string;
  trackAdmin?: boolean;
};

export function AnalyticsProvider({ locale, trackAdmin }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    if (!trackAdmin && pathname.includes("/admin")) return;
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    trackPageView(fullPath, locale);
  }, [pathname, searchParams, locale, trackAdmin]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!trackAdmin && window.location.pathname.includes("/admin")) return;
      const target = event.target as HTMLElement | null;
      const button = target?.closest?.("[data-analytics='cta']") as HTMLElement | null;
      if (!button) return;
      const label = button.getAttribute("data-analytics-label") ?? button.textContent?.trim() ?? "CTA";
      const href = button.getAttribute("href") ?? button.getAttribute("data-analytics-href") ?? undefined;
      trackCtaClick(label, href);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [trackAdmin]);

  return null;
}
