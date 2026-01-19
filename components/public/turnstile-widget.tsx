"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";

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
  const callbackName = useRef(`hcaptchaCallback_${id}`);
  const expiredName = useRef(`hcaptchaExpired_${id}`);

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
      <Script src="https://js.hcaptcha.com/1/api.js" async defer />
      <div
        className="h-captcha"
        data-sitekey={SITE_KEY}
        data-callback={callbackName.current}
        data-expired-callback={expiredName.current}
      />
    </div>
  );
}
