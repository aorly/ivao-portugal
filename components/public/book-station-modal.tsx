"use client";

import { useActionState, useEffect, useState } from "react";

type Station = {
  code: string;
  label: string;
};

type Props = {
  action: (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
  stations: Station[];
  bookingStartDefault: string;
  bookingEndDefault: string;
  bookingMaxToday: string;
};

type FormState = {
  success: boolean;
  error: string | null;
};

const initialState: FormState = { success: false, error: null };

export function BookStationModal({ action, stations, bookingStartDefault, bookingEndDefault, bookingMaxToday }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(async (_prev: FormState, formData: FormData) => {
    const result = await action(formData);
    return { success: Boolean(result?.success), error: result?.error ?? null };
  }, initialState);

  useEffect(() => {
    if (!state.success) return undefined;
    const timer = setTimeout(() => setOpen(false), 600);
    return () => clearTimeout(timer);
  }, [state.success]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
        data-analytics="cta"
        data-analytics-label="ATC booking open"
      >
        Book a station
      </button>
      {state.success ? (
        <p className="mt-2 text-xs font-semibold text-[color:var(--success)]">Booking submitted.</p>
      ) : state.error ? (
        <p className="mt-2 text-xs font-semibold text-[color:var(--danger)]">{state.error}</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Book a station</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                Close
              </button>
            </div>
            <form action={formAction} className="mt-3 space-y-3 text-[11px]">
              <label htmlFor="booking-station" className="sr-only">
                Station callsign
              </label>
              <input
                id="booking-station"
                name="station"
                placeholder="LPPT_TWR"
                aria-label="Station callsign"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
              />
              <div className="flex flex-wrap gap-2">
                {stations.map((station) => (
                  <span
                    key={station.code}
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-muted)]"
                  >
                    {station.code}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label htmlFor="booking-start" className="sr-only">
                  Start time (UTC)
                </label>
                <input
                  id="booking-start"
                  name="start"
                  type="datetime-local"
                  defaultValue={bookingStartDefault}
                  min={bookingStartDefault}
                  max={bookingMaxToday}
                  aria-label="Start time (UTC)"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)] outline-none"
                />
                <label htmlFor="booking-end" className="sr-only">
                  End time (UTC)
                </label>
                <input
                  id="booking-end"
                  name="end"
                  type="datetime-local"
                  defaultValue={bookingEndDefault}
                  min={bookingStartDefault}
                  max={bookingMaxToday}
                  aria-label="End time (UTC)"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)] outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-[color:var(--text-muted)]">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="training" className="h-3 w-3 rounded border-[color:var(--border)] bg-[color:var(--surface)]" />
                  <span>Training</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="exam" className="h-3 w-3 rounded border-[color:var(--border)] bg-[color:var(--surface)]" />
                  <span>Exam</span>
                </label>
              </div>
              <button
                type="submit"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-primary)] hover:border-[color:var(--primary)] disabled:opacity-70"
                data-analytics="cta"
                data-analytics-label="ATC booking submit"
                disabled={isPending}
              >
                {isPending ? "Submitting..." : "Submit Booking"}
              </button>
              {state.error ? (
                <p className="text-xs font-semibold text-[color:var(--danger)]">{state.error}</p>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
