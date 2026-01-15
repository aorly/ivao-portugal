"use client";

import { useState } from "react";

type Props = {
  label: string;
};

export function SignInButton({ label }: Props) {
  const [pending, setPending] = useState(false);
  const loginUrl = "/api/ivao/login";

  return (
    <button
      type="button"
      onClick={() => {
        setPending(true);
        window.location.href = loginUrl;
      }}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--brand-500)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--brand-400)] disabled:opacity-70"
      disabled={pending}
    >
      {label}
      <span aria-hidden="true">-&gt;</span>
    </button>
  );
}
