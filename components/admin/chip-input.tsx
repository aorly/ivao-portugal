"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  label?: string;
  placeholder?: string;
  initial?: string[];
};

export function ChipInput({ name, label, placeholder, initial = [] }: Props) {
  const [chips, setChips] = useState<string[]>(initial);
  const [value, setValue] = useState("");

  useEffect(() => {
    setChips(initial);
  }, [initial]);

  const addChip = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (chips.includes(trimmed)) {
      setValue("");
      return;
    }
    setChips([...chips, trimmed]);
    setValue("");
  };

  const removeChip = (chip: string) => {
    setChips(chips.filter((c) => c !== chip));
  };

  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-semibold text-[color:var(--text-primary)]">{label}</p> : null}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm"
          >
            {chip}
            <button
              type="button"
              className="text-[color:var(--danger)]"
              onClick={() => removeChip(chip)}
            >
              ×
            </button>
            <input type="hidden" name={name} value={chip} />
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip();
            }
          }}
          placeholder={placeholder ?? "Add item"}
          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
        <button
          type="button"
          className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          onClick={addChip}
        >
          Add
        </button>
      </div>
    </div>
  );
}
