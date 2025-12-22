"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AirspaceBand, AirspaceSegment } from "@/lib/airspace";

type BoundaryOption = { id: string; label: string };

type Props = {
  segment?: AirspaceSegment;
  boundaryOptions: BoundaryOption[];
  action: (formData: FormData) => Promise<void>;
};

export function AirspaceForm({ segment, boundaryOptions, action }: Props) {
  const [bands, setBands] = useState<AirspaceBand[]>(segment?.bands ?? [{ from: "", to: "", class: "", note: "" }]);

  const updateBand = (idx: number, key: keyof AirspaceBand, value: string) => {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, [key]: value } : b)));
  };

  const addBand = () => setBands((prev) => [...prev, { from: "", to: "", class: "", note: "" }]);
  const removeBand = (idx: number) => setBands((prev) => prev.filter((_, i) => i !== idx));

  const bandsJson = useMemo(() => JSON.stringify(bands), [bands]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" defaultValue={segment?.id ?? ""} />
      <input type="hidden" name="bands" value={bandsJson} readOnly />
      <Card className="space-y-3 border border-[color:var(--border)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Title</span>
            <input
              name="title"
              defaultValue={segment?.title ?? ""}
              required
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Slug (optional)</span>
            <input
              name="slug"
              defaultValue={segment?.slug ?? ""}
              placeholder="auto from title"
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">FIR</span>
            <select
              name="fir"
              defaultValue={segment?.fir ?? "LPPC"}
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
            >
              <option value="LPPC">LPPC</option>
              <option value="LPPO">LPPO</option>
            </select>
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-[color:var(--text-muted)]">Lateral limits</span>
          <textarea
            name="lateralLimits"
            defaultValue={segment?.lateralLimits ?? ""}
            required
            className="min-h-[80px] w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-[color:var(--text-muted)]">Service unit</span>
          <input
            name="service"
            defaultValue={segment?.service ?? ""}
            required
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Remarks</span>
            <textarea
              name="remarks"
              defaultValue={segment?.remarks ?? ""}
              className="min-h-[60px] w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Source link</span>
            <input
              name="source"
              defaultValue={segment?.source ?? ""}
              placeholder="https://..."
              className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="text-[color:var(--text-muted)]">Boundary (optional)</span>
          <select
            name="boundaryId"
            defaultValue={segment?.boundaryId ?? ""}
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {boundaryOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Vertical bands</p>
            <Button type="button" size="sm" variant="secondary" onClick={addBand}>
              Add band
            </Button>
          </div>
          <div className="space-y-2">
            {bands.map((band, idx) => (
              <div key={idx} className="grid gap-2 rounded border border-[color:var(--border)] p-2 md:grid-cols-4">
                <input
                  placeholder="From (e.g., FL245)"
                  value={band.from}
                  onChange={(e) => updateBand(idx, "from", e.target.value)}
                  aria-label={`Band ${idx + 1} lower limit`}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                />
                <input
                  placeholder="To (e.g., FL115)"
                  value={band.to}
                  onChange={(e) => updateBand(idx, "to", e.target.value)}
                  aria-label={`Band ${idx + 1} upper limit`}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                />
                <input
                  placeholder="Class (e.g., C)"
                  value={band.class}
                  onChange={(e) => updateBand(idx, "class", e.target.value)}
                  aria-label={`Band ${idx + 1} class`}
                  className="rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                />
                <div className="flex gap-2">
                  <input
                    placeholder="Note"
                    value={band.note ?? ""}
                    onChange={(e) => updateBand(idx, "note", e.target.value)}
                    aria-label={`Band ${idx + 1} note`}
                    className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBand(idx)}
                    aria-label="Remove band"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            {bands.length === 0 ? <p className="text-xs text-[color:var(--text-muted)]">No bands added.</p> : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="primary">
            {segment ? "Update segment" : "Create segment"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
