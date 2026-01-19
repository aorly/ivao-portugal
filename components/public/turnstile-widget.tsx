"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAACNclGnkKSpSRyL3";

type Props = {
  onVerify: (token: string) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
      reset?: (id: string) => void;
    };
  }
}

export function TurnstileWidget({ onVerify }: Props) {
  const widgetId = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderWidget = useCallback(() => {
    if (!window.turnstile || !containerRef.current) return;
    if (widgetId.current) {
      window.turnstile.reset?.(widgetId.current);
      return;
    }
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token) => onVerify(token),
      "expired-callback": () => onVerify(""),
    });
  }, [onVerify]);

  useEffect(() => {
    renderWidget();
  }, [renderWidget]);

  return (
    <div className="space-y-2">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={renderWidget}
      />
      <div ref={containerRef} />
    </div>
  );
}
