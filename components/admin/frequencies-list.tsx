"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateFrequency, deleteFrequency } from "@/app/[locale]/(dashboard)/admin/frequencies/actions";

type Frequency = {
  id: string;
  station: string;
  frequency: string;
  name?: string | null;
  lower?: string | null;
  upper?: string | null;
  restricted?: boolean;
  firId?: string | null;
  firSlug?: string | null;
  airportId?: string | null;
  airportIcao?: string | null;
  airportIds?: string[];
  airportIcaos?: string[];
  hasBoundary?: boolean;
};

type Option = { id: string; label: string };

type Props = {
  frequencies: Frequency[];
  firOptions: Option[];
  airportOptions: Option[];
};

export function FrequenciesList({ frequencies, firOptions, airportOptions }: Props) {
  const [editing, setEditing] = useState<Frequency | null>(null);
  const [isPending, startTransition] = useTransition();
  const modalTitleId = useId();

  const handleUpdate = async (formData: FormData) => {
    await updateFrequency(formData);
    startTransition(() => setEditing(null));
  };

  return (
    <>
      <div className="space-y-2">
        {frequencies.map((freq) => (
          <form
            key={freq.id}
            action={deleteFrequency}
            className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          >
            <input type="hidden" name="id" value={freq.id} />
            <div className="space-y-1">
              <p className="flex items-center gap-2 font-semibold text-[color:var(--text-primary)]">
                {freq.station} - {freq.frequency}
                {freq.hasBoundary ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--primary)] bg-[color:var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--primary)]">
                    Boundary
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                {freq.name ?? "Unnamed"} - {freq.firSlug ?? "N/A"}{" "}
                {freq.airportIcaos?.length
                  ? `- ${freq.airportIcaos.join(", ")}`
                  : freq.airportIcao
                    ? `- ${freq.airportIcao}`
                    : ""}{" "}
                - {freq.lower ?? "N/A"}/{freq.upper ?? "N/A"} {freq.restricted ? "- RESTRICTED" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(freq)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost">
                Delete
              </Button>
            </div>
          </form>
        ))}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            className="w-full max-w-lg space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
          >
            <div className="flex items-center justify-between">
              <p id={modalTitleId} className="text-sm font-semibold text-[color:var(--text-primary)]">
                Edit frequency
              </p>
              <button
                type="button"
                className="text-sm text-[color:var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
                onClick={() => setEditing(null)}
              >
                Close
              </button>
            </div>
            <form action={handleUpdate} className="space-y-3">
              <input type="hidden" name="id" value={editing.id} />
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  name="station"
                  defaultValue={editing.station}
                  aria-label="Station"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                />
                <input
                  name="frequency"
                  defaultValue={editing.frequency}
                  aria-label="Frequency"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                />
              </div>
              <input
                name="name"
                defaultValue={editing.name ?? ""}
                placeholder="Name"
                aria-label="Name"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                disabled={isPending}
              />
              <div className="grid gap-2 md:grid-cols-2">
                <input
                  name="lower"
                  defaultValue={editing.lower ?? ""}
                  placeholder="Lower (e.g., GND or FL100)"
                  aria-label="Lower limit"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                />
                <input
                  name="upper"
                  defaultValue={editing.upper ?? ""}
                  placeholder="Upper (e.g., UNL or FL245)"
                  aria-label="Upper limit"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  name="restricted"
                  defaultChecked={Boolean(editing.restricted)}
                  className="h-4 w-4"
                  disabled={isPending}
                />
                <span>Requires ATC dept authorization</span>
              </label>
              <div className="grid gap-2 md:grid-cols-2">
                <select
                  name="firId"
                  defaultValue={editing.firId ?? ""}
                  aria-label="FIR"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                >
                  <option value="">(Optional) FIR</option>
                  {firOptions.map((fir) => (
                    <option key={fir.id} value={fir.id}>
                      {fir.label}
                    </option>
                  ))}
                </select>
                <select
                  name="airportIds"
                  multiple
                  defaultValue={
                    editing.airportIds?.length
                      ? editing.airportIds
                      : editing.airportId
                        ? [editing.airportId]
                        : []
                  }
                  aria-label="Airports"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  disabled={isPending}
                >
                  {airportOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={isPending}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
