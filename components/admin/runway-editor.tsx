"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Runway = {
  id: string;
  heading?: string;
  length?: number | string;
  holdingPoints?: { name: string; length?: number | string; preferred?: boolean }[];
};

type Props = {
  name: string;
  label?: string;
  initial?: Runway[];
};

function normalizeHoldingPoints(holdingPoints: Runway["holdingPoints"]) {
  if (!Array.isArray(holdingPoints)) return [];
  return holdingPoints
    .map((h) => {
      if (!h) return null;
      if (typeof h === "object" && "name" in h) {
        return {
          name: String((h as { name: unknown }).name),
          length: (h as { length?: unknown }).length ?? "",
          preferred: Boolean((h as { preferred?: unknown }).preferred),
        };
      }
      return { name: String(h), length: "", preferred: false };
    })
    .filter(Boolean) as { name: string; length?: string | number; preferred?: boolean }[];
}

export function RunwayEditor({ name, label, initial = [] }: Props) {
  const [items, setItems] = useState<Runway[]>(
    initial.map((r) => ({
      id: r.id,
      heading: r.heading ?? "",
      length: r.length ?? "",
      holdingPoints: normalizeHoldingPoints(r.holdingPoints),
    })),
  );
  const [draft, setDraft] = useState<Runway>({ id: "", heading: "", length: "", holdingPoints: [] });
  const [hpDrafts, setHpDrafts] = useState<Record<string, { name: string; length: string | number; preferred?: boolean }>>({});

  const addRunway = () => {
    const id = draft.id.trim();
    if (!id) return;
    setItems((prev) => [
      ...prev,
      { id, heading: draft.heading?.trim() ?? "", length: draft.length ?? "", holdingPoints: normalizeHoldingPoints(draft.holdingPoints) },
    ]);
    setDraft({ id: "", heading: "", length: "", holdingPoints: [] });
  };

  const removeRunway = (id: string) => setItems((prev) => prev.filter((r) => r.id !== id));

  const setHpDraft = (runwayId: string, field: "name" | "length" | "preferred", value: string | boolean) =>
    setHpDrafts((prev) => ({
      ...prev,
      [runwayId]: {
        name: field === "name" ? String(value) : prev[runwayId]?.name ?? "",
        length: field === "length" ? String(value) : prev[runwayId]?.length ?? "",
        preferred: field === "preferred" ? Boolean(value) : prev[runwayId]?.preferred ?? false,
      },
    }));

  const addHoldingPointToRunway = (runwayId: string) => {
    const draftHp = hpDrafts[runwayId] ?? { name: "", length: "", preferred: false };
    const nameVal = String(draftHp.name ?? "").trim();
    const lengthVal = String(draftHp.length ?? "").trim();
    const preferred = Boolean(draftHp.preferred);
    if (!nameVal) return;
    setItems((prev) =>
      prev.map((r) =>
        r.id === runwayId
          ? {
              ...r,
              holdingPoints: (r.holdingPoints ?? []).some((hp) => hp.name === nameVal)
                ? r.holdingPoints
                : [
                    ...(preferred ? (r.holdingPoints ?? []).map((hp) => ({ ...hp, preferred: false })) : r.holdingPoints ?? []),
                    { name: nameVal, length: lengthVal, preferred },
                  ],
            }
          : r,
      ),
    );
    setHpDrafts((prev) => ({ ...prev, [runwayId]: { name: "", length: "", preferred: false } }));
  };

  const removeHoldingPoint = (runwayId: string, hpName: string) =>
    setItems((prev) =>
      prev.map((r) =>
        r.id === runwayId ? { ...r, holdingPoints: (r.holdingPoints ?? []).filter((hp) => hp.name !== hpName) } : r,
      ),
    );

  const markPreferred = (runwayId: string, hpName: string) =>
    setItems((prev) =>
      prev.map((r) =>
        r.id === runwayId
          ? {
              ...r,
              holdingPoints: (r.holdingPoints ?? []).map((hp) => ({
                ...hp,
                preferred: hp.name === hpName,
              })),
            }
          : r,
      ),
    );

  const serialized = useMemo(() => JSON.stringify(items), [items]);

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs text-[color:var(--text-muted)]">{label}</p> : null}
      <div className="space-y-2">
        {items.map((rwy) => (
          <div
            key={rwy.id}
            className="space-y-2 rounded-xl bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {rwy.id} {rwy.heading ? `(${rwy.heading})` : ""}
              </span>
              <Button size="sm" variant="ghost" type="button" onClick={() => removeRunway(rwy.id)} aria-label={`Remove runway ${rwy.id}`}>
                Remove
              </Button>
            </div>
            {rwy.length ? (
              <p className="text-xs text-[color:var(--text-muted)]">Length: {rwy.length}</p>
            ) : null}
            {rwy.holdingPoints && rwy.holdingPoints.length ? (
              <div className="space-y-1 text-xs text-[color:var(--text-muted)]">
                {rwy.holdingPoints.map((hp) => (
                  <div
                    key={hp.name}
                    className="flex flex-wrap items-center gap-2 rounded-lg bg-[color:var(--surface-2)] px-2 py-1"
                  >
                    <span className="text-[color:var(--text-primary)]">
                      {hp.name} {hp.length ? `(${hp.length})` : ""}
                    </span>
                    <label className="flex items-center gap-1 text-[color:var(--text-muted)]">
                      <input
                        type="checkbox"
                        checked={Boolean(hp.preferred)}
                        onChange={() => markPreferred(rwy.id, hp.name)}
                        className="accent-[color:var(--primary)]"
                      />
                      Preferred
                    </label>
                    <button
                      type="button"
                      className="text-[color:var(--danger)]"
                      onClick={() => removeHoldingPoint(rwy.id, hp.name)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <input
                placeholder="Holding point"
                value={hpDrafts[rwy.id]?.name ?? ""}
                onChange={(e) => setHpDraft(rwy.id, "name", e.target.value)}
                aria-label={`Holding point name for runway ${rwy.id}`}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHoldingPointToRunway(rwy.id);
                  }
                }}
              />
              <input
                placeholder="HP length (m)"
                value={hpDrafts[rwy.id]?.length ?? ""}
                onChange={(e) => setHpDraft(rwy.id, "length", e.target.value)}
                aria-label={`Holding point length for runway ${rwy.id}`}
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <label className="flex items-center gap-1 text-xs text-[color:var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={Boolean(hpDrafts[rwy.id]?.preferred)}
                  onChange={(e) => setHpDraft(rwy.id, "preferred", e.target.checked)}
                  className="accent-[color:var(--primary)]"
                />
                Preferred
              </label>
              <Button type="button" variant="secondary" size="sm" onClick={() => addHoldingPointToRunway(rwy.id)}>
                Add HP
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <input
          placeholder="Runway (e.g., 02)"
          value={draft.id}
          onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
          aria-label="Runway identifier"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <input
          placeholder="Heading (e.g., 024)"
          value={draft.heading}
          onChange={(e) => setDraft((prev) => ({ ...prev, heading: e.target.value }))}
          aria-label="Runway heading"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <input
          placeholder="Length (m)"
          value={draft.length ?? ""}
          onChange={(e) => setDraft((prev) => ({ ...prev, length: e.target.value }))}
          aria-label="Runway length"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addRunway}>
        Add runway
      </Button>
      <input type="hidden" name={name} value={serialized} />
    </div>
  );
}
