"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  name: string;
  initial?: string[];
  options: string[];
  label?: string;
};

function normalize(value: string) {
  return value.trim().toUpperCase();
}

export function MultiAirportInput({ name, initial = [], options, label }: Props) {
  const [items, setItems] = useState<string[]>(initial.map(normalize).filter(Boolean));
  const inputRef = useRef<HTMLInputElement>(null);
  const optionSet = useMemo(() => new Set(options.map(normalize)), [options]);

  const add = (raw: string) => {
    const next = normalize(raw);
    if (!next || items.includes(next)) return;
    setItems((prev) => [...prev, next]);
  };

  const remove = (value: string) => setItems((prev) => prev.filter((i) => i !== value));

  const onSubmit = () => {
    if (inputRef.current) {
      add(inputRef.current.value);
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs text-[color:var(--text-muted)]">{label}</p> : null}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
            onClick={() => remove(item)}
          >
            {item} ✕
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          list={`${name}-options`}
          placeholder="Add airport ICAO"
          className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={onSubmit}>
          Add
        </Button>
      </div>
      <datalist id={`${name}-options`}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={items.join(", ")} />
      <p className="text-xs text-[color:var(--text-muted)]">
        Click a chip to remove. Suggestions come from known airports{optionSet.size ? "" : " (none)" }.
      </p>
    </div>
  );
}
