"use client";

import Script from "next/script";
import { useEffect, useId } from "react";

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
  const callbackName = `hcaptchaCallback_${id}`;
  const expiredName = `hcaptchaExpired_${id}`;

  useEffect(() => {
    window[callbackName] = (token: string) => onVerify(token);
    window[expiredName] = () => onVerify("");
    return () => {
      delete window[callbackName];
      delete window[expiredName];
    };
  }, [callbackName, expiredName, onVerify]);

  return (
    <div className="space-y-2">
      <Script src="https://js.hcaptcha.com/1/api.js" async defer />
      <div
        className="h-captcha"
        data-sitekey={SITE_KEY}
        data-callback={callbackName}
        data-expired-callback={expiredName}
      />
    </div>
  );
}
