"use client";

import { useEffect, useState } from "react";

type Props = {
  airportIcao: string;
  accept: string;
  selectedFieldName?: string;
};

export function ProcedureFilePicker({ airportIcao, accept, selectedFieldName = "selectedProcedures" }: Props) {
  const [names, setNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleFile = async (file: File | null) => {
    if (!file) {
      setNames([]);
      setSelected(new Set());
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const found = new Set<string>();
    lines.forEach((line) => {
      const parts = line.replace(/;+$/, "").split(";").map((p) => p.trim());
      if (parts.length >= 3 && parts[0].toUpperCase() === airportIcao.toUpperCase()) {
        found.add(parts[2].toUpperCase());
      }
    });
    setNames(Array.from(found));
    setSelected(new Set(found));
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        name="proceduresFile"
        accept={accept}
        className="text-xs text-[color:var(--text-primary)]"
        required
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {names.length ? (
        <div className="space-y-1 rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-[10px]">
          <div className="flex items-center gap-2 text-[color:var(--text-primary)]">
            <button
              type="button"
              className="rounded border border-[color:var(--border)] px-2 py-0.5 hover:border-[color:var(--primary)]"
              onClick={() => setSelected(new Set(names))}
            >
              Select all
            </button>
            <button
              type="button"
              className="rounded border border-[color:var(--border)] px-2 py-0.5 hover:border-[color:var(--primary)]"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </button>
            <span className="text-[color:var(--text-muted)]">{selectedCount} / {names.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {names.map((n) => (
              <label key={n} className="inline-flex items-center gap-1 rounded bg-[color:var(--surface-3)] px-2 py-1 text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={selected.has(n)}
                  onChange={() => toggle(n)}
                />
                <span>{n}</span>
              </label>
            ))}
          </div>
          <input type="hidden" name={`${selectedFieldName}Csv`} value={Array.from(selected).join(",")} />
          {Array.from(selected).map((n) => (
            <input key={n} type="hidden" name={selectedFieldName} value={n} />
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-[color:var(--text-muted)]">Upload to preview and select procedures.</p>
      )}
    </div>
  );
}
