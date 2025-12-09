"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Runway = {
  id: string;
  heading?: string;
  length?: number | string;
  holdingPoints?: { name: string; length?: number | string }[];
};

type Props = {
  name: string;
  label?: string;
  initial?: Runway[];
};

export function RunwayEditor({ name, label, initial = [] }: Props) {
  const [items, setItems] = useState<Runway[]>(
    initial.map((r) => ({
      id: r.id,
      heading: r.heading ?? "",
      length: r.length ?? "",
      holdingPoints: Array.isArray(r.holdingPoints)
        ? r.holdingPoints
            .map((h) => {
              if (!h) return null;
              if (typeof h === "object" && "name" in h) {
                return { name: String((h as { name: unknown }).name), length: (h as { length?: unknown }).length ?? "" };
              }
              return { name: String(h), length: "" };
            })
            .filter(Boolean) as { name: string; length?: string | number }[]
        : [],
    })),
  );
  const [draft, setDraft] = useState<Runway>({ id: "", heading: "", length: "", holdingPoints: [] });
  const [hpName, setHpName] = useState("");
  const [hpLength, setHpLength] = useState("");

  const addRunway = () => {
    const id = draft.id.trim();
    if (!id) return;
    setItems((prev) => [
      ...prev,
      { id, heading: draft.heading?.trim() ?? "", length: draft.length ?? "", holdingPoints: draft.holdingPoints },
    ]);
    setDraft({ id: "", heading: "", length: "", holdingPoints: [] });
    setHpName("");
    setHpLength("");
  };

  const removeRunway = (id: string) => setItems((prev) => prev.filter((r) => r.id !== id));

  const addHoldingPoint = () => {
    const name = hpName.trim();
    if (!name) return;
    setDraft((prev) => ({
      ...prev,
      holdingPoints: (prev.holdingPoints ?? []).find((h) => h.name === name)
        ? prev.holdingPoints
        : [...(prev.holdingPoints ?? []), { name, length: hpLength }],
    }));
    setHpName("");
    setHpLength("");
  };

  const removeHolding = (hp: string) =>
    setDraft((prev) => ({ ...prev, holdingPoints: (prev.holdingPoints ?? []).filter((h) => h !== hp) }));

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs text-[color:var(--text-muted)]">{label}</p> : null}
      <div className="space-y-2">
        {items.map((rwy) => (
          <div
            key={rwy.id}
            className="space-y-1 rounded-xl bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {rwy.id} {rwy.heading ? `(${rwy.heading})` : ""}
              </span>
              <Button size="sm" variant="ghost" type="button" onClick={() => removeRunway(rwy.id)}>
                Remove
              </Button>
            </div>
            {rwy.holdingPoints && rwy.holdingPoints.length ? (
              <div className="flex flex-wrap gap-1 text-xs text-[color:var(--text-muted)]">
                {rwy.holdingPoints.map((hp) => (
                  <span key={hp} className="rounded-full bg-[color:var(--surface-2)] px-2 py-1">
                    {hp}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <input
          placeholder="Runway (e.g., 02)"
          value={draft.id}
          onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <input
          placeholder="Heading (e.g., 024)"
          value={draft.heading}
          onChange={(e) => setDraft((prev) => ({ ...prev, heading: e.target.value }))}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <input
          placeholder="Length (m)"
          value={draft.length ?? ""}
          onChange={(e) => setDraft((prev) => ({ ...prev, length: e.target.value }))}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Holding point"
          value={hpName}
          onChange={(e) => setHpName(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addHoldingPoint();
            }
          }}
        />
        <input
          placeholder="HP length (m)"
          value={hpLength}
          onChange={(e) => setHpLength(e.target.value)}
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <Button type="button" variant="secondary" size="sm" onClick={addHoldingPoint}>
          Add HP
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
        {(draft.holdingPoints ?? []).map((hp) => (
          <button
            key={hp.name}
            type="button"
            className="rounded-full bg-[color:var(--surface-3)] px-2 py-1"
            onClick={() => removeHolding(hp.name)}
          >
            {hp.name} {hp.length ? `(${hp.length})` : ""} ✕
          </button>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addRunway}>
        Add runway
      </Button>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
