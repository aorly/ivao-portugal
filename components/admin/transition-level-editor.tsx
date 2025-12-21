"use client";

import { useMemo, useState } from "react";
import type { TlGroup, Band } from "@/lib/transition-level";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  initial: TlGroup[];
  action: (formData: FormData) => Promise<void>;
};

export function TransitionLevelEditor({ initial, action }: Props) {
  const [groups, setGroups] = useState<TlGroup[]>(initial);

  const addGroup = () => {
    setGroups((prev) => [
      ...prev,
      { taFt: 4000, icaos: [], bands: [{ max: 942.2, tl: 75 }, { min: 1050.3, tl: 40 }] },
    ]);
  };

  const removeGroup = (idx: number) => setGroups((prev) => prev.filter((_, i) => i !== idx));

  const updateGroup = (idx: number, patch: Partial<TlGroup>) => {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const updateBand = (gIdx: number, bIdx: number, patch: Partial<Band>) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? { ...g, bands: g.bands.map((b, j) => (j === bIdx ? { ...b, ...patch } : b)) }
          : g,
      ),
    );
  };

  const addBand = (gIdx: number) => {
    setGroups((prev) =>
      prev.map((g, i) => (i === gIdx ? { ...g, bands: [...g.bands, { tl: 0 }] } : g)),
    );
  };

  const removeBand = (gIdx: number, bIdx: number) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx ? { ...g, bands: g.bands.filter((_, j) => j !== bIdx) } : g,
      ),
    );
  };

  const jsonValue = useMemo(() => JSON.stringify(groups, null, 2), [groups]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="raw" value={jsonValue} readOnly />
      <div className="space-y-3">
        {groups.map((g, idx) => (
          <Card key={idx} className="space-y-3 border border-[color:var(--border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Group {idx + 1}</p>
              <Button type="button" size="sm" variant="ghost" className="text-[color:var(--danger)]" onClick={() => removeGroup(idx)}>
                Remove
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">Transition altitude (ft)</span>
                <input
                  type="number"
                  name={`ta-${idx}`}
                  value={g.taFt}
                  onChange={(e) => updateGroup(idx, { taFt: Number(e.target.value) || 0 })}
                  className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-[color:var(--text-muted)]">ICAOs (comma separated)</span>
                <input
                  type="text"
                  value={g.icaos.join(", ")}
                  onChange={(e) =>
                    updateGroup(
                      idx,
                      Object.assign({}, g, {
                        icaos: e.target.value
                          .split(",")
                          .map((v) => v.trim().toUpperCase())
                          .filter(Boolean),
                      }),
                    )
                  }
                  className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Bands</p>
                <Button type="button" size="sm" variant="secondary" onClick={() => addBand(idx)}>
                  Add band
                </Button>
              </div>
              <div className="space-y-2">
                {g.bands.map((b, bIdx) => (
                  <div key={bIdx} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto] items-center rounded border border-[color:var(--border)] p-2">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min QNH"
                      value={b.min ?? ""}
                      onChange={(e) => updateBand(idx, bIdx, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max QNH"
                      value={b.max ?? ""}
                      onChange={(e) => updateBand(idx, bIdx, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="TL"
                      value={b.tl}
                      onChange={(e) => updateBand(idx, bIdx, { tl: Number(e.target.value) || 0 })}
                      className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm"
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeBand(idx, bIdx)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {g.bands.length === 0 ? (
                  <p className="text-xs text-[color:var(--text-muted)]">No bands. Add at least one TL band.</p>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={addGroup}>
          Add group
        </Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </form>
  );
}
