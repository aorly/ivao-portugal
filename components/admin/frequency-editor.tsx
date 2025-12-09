"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Frequency = {
  id: string;
  value: string;
};

type Props = {
  name: string;
  initial?: Frequency[];
  label?: string;
};

export function FrequencyEditor({ name, initial = [], label }: Props) {
  const [items, setItems] = useState<Frequency[]>(
    initial.map((f) => ({
      id: f.id ?? "",
      value: f.value ?? "",
    })),
  );
  const [draft, setDraft] = useState<Frequency>({ id: "", value: "" });

  const addFrequency = () => {
    if (!draft.id.trim() || !draft.value.trim()) return;
    setItems((prev) => [...prev, { id: draft.id.trim(), value: draft.value.trim() }]);
    setDraft({ id: "", value: "" });
  };

  const removeFrequency = (id: string) => setItems((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs text-[color:var(--text-muted)]">{label}</p> : null}
      <div className="space-y-2">
        {items.map((f) => (
          <div
            key={`${f.id}-${f.value}`}
            className="flex items-center justify-between rounded-xl bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <div>
              <p className="font-semibold">{f.id}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{f.value}</p>
            </div>
            <Button size="sm" variant="ghost" type="button" onClick={() => removeFrequency(f.id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <input
          placeholder="Identification (e.g., TWR)"
          value={draft.id}
          onChange={(e) => setDraft((prev) => ({ ...prev, id: e.target.value }))}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <input
          placeholder="Frequency (e.g., 118.105)"
          value={draft.value}
          onChange={(e) => setDraft((prev) => ({ ...prev, value: e.target.value }))}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={addFrequency}>
        Add frequency
      </Button>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
    </div>
  );
}
