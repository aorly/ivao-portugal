"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SaveToastProps = {
  title?: string;
  message?: string;
  param?: string;
  durationMs?: number;
};

export function SaveToast({
  title = "Saved",
  message = "Your changes were saved.",
  param = "saved",
  durationMs = 2400,
}: SaveToastProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const paramValue = searchParams.get(param);
  const visible = Boolean(paramValue);

  useEffect(() => {
    if (!paramValue) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete(param);
    const url = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
    const timer = setTimeout(() => router.replace(url, { scroll: false }), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, param, paramValue, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-4 z-50 w-[92vw] max-w-sm overflow-hidden rounded-xl border border-emerald-400/30 bg-[color:var(--surface)] shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.425.01L3.3 9.85a1 1 0 1 1 1.4-1.43l3.2 3.13 6.79-6.26a1 1 0 0 1 1.414 0Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{title}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete(param);
            const url = nextParams.toString() ? `${pathname}?${nextParams}` : pathname;
            router.replace(url, { scroll: false });
          }}
          className="rounded-md p-1 text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
