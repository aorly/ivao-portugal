"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  message: string;
  dismissHref: string;
  actionHref?: string;
  actionLabel?: string;
  durationMs?: number;
};

export function SaveNotification({
  message,
  dismissHref,
  actionHref,
  actionLabel = "Back to airports",
  durationMs = 3500,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
      router.replace(dismissHref);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, dismissHref, durationMs, router]);

  if (!open) return null;

  return (
    <div className="fixed right-6 top-6 z-[60] w-[min(92vw,420px)]">
      <div className="rounded-2xl border border-[#22c55e]/40 bg-[#ecfdf5] text-[#166534] shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[#22c55e]" aria-hidden="true" />
            <div className="flex-1 text-sm font-semibold">{message}</div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.replace(dismissHref);
              }}
              className="text-xs font-semibold text-[#166534] hover:text-[#14532d]"
              aria-label="Close notification"
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {actionHref ? (
              <a
                href={actionHref}
                className="rounded-full border border-[#22c55e]/40 bg-white px-3 py-1 font-semibold text-[#166534] hover:bg-[#dcfce7]"
              >
                {actionLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
