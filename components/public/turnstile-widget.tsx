"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAACNclGnkKSpSRyL3";

type Props = {
  onVerify: (token: string) => void;
};

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

export function TurnstileWidget({ onVerify }: Props) {
  const id = useId().replace(/:/g, "");
  const callbackName = useRef(`turnstileCallback_${id}`);
  const expiredName = useRef(`turnstileExpired_${id}`);

  useEffect(() => {
    window[callbackName.current] = (token: string) => onVerify(token);
    window[expiredName.current] = () => onVerify("");
    return () => {
      delete window[callbackName.current];
      delete window[expiredName.current];
    };
  }, [onVerify]);

  return (
    <div className="space-y-2">
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      <div
        className="cf-turnstile"
        data-sitekey={SITE_KEY}
        data-callback={callbackName.current}
        data-expired-callback={expiredName.current}
      />
    </div>
  );
}
