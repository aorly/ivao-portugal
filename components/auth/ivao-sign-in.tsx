"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  callbackUrl?: string;
};

export function IvaoSignInButton({ label, callbackUrl }: Props) {
  const [pending, setPending] = useState(false);
  const loginUrl = callbackUrl
    ? `/api/ivao/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/api/ivao/login";

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.href = loginUrl;
      }}
    >
      {label}
    </Button>
  );
}
