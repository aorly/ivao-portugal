"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  triggerLabel?: string;
};

export function AirportSyncModal({
  children,
  title = "IVAO Sync",
  description = "Sync all airports with IVAO. This can take a few minutes.",
  triggerLabel = "Sync all",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" type="button" onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Sync</p>
                <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</p>
              </div>
              <Button size="sm" variant="ghost" type="button" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
