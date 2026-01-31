"use client";

import { useEffect } from "react";
import type React from "react";

type Props = {
  callbackUrl?: string;
  children?: React.ReactNode;
  disabled?: boolean;
};

// Automatically triggers IVAO SSO as soon as the login page renders.
export function AutoIvaoSignIn({ callbackUrl, children, disabled }: Props) {
  useEffect(() => {
    if (disabled) return;
    const target = callbackUrl ?? "/";

    let attempted = false;

    const doLogin = async () => {
      if (attempted) return;
      attempted = true;
      try {
        // Manual form POST with CSRF to avoid landing on the provider list and prevent loops.
        const res = await fetch("/api/auth/csrf", { credentials: "include" });
        const data = (await res.json()) as { csrfToken?: string };
        const csrfToken = data?.csrfToken ?? "";

        const form = document.createElement("form");
        form.method = "post";
        form.action = `/api/auth/signin/ivao`;
        form.style.display = "none";

        const csrfInput = document.createElement("input");
        csrfInput.type = "hidden";
        csrfInput.name = "csrfToken";
        csrfInput.value = csrfToken;
        form.appendChild(csrfInput);

        const cbInput = document.createElement("input");
        cbInput.type = "hidden";
        cbInput.name = "callbackUrl";
        cbInput.value = target;
        form.appendChild(cbInput);

        document.body.appendChild(form);
        form.submit();
      } catch {
        // Last resort: hit provider URL directly.
        window.location.href = `/api/auth/signin/ivao?callbackUrl=${encodeURIComponent(target)}`;
      }
    };

    void doLogin();
  }, [callbackUrl, disabled]);

  return <>{children}</>;
}
