"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/components/puck/config";

type Props = {
  name: string;
  defaultValue?: string;
  label?: string;
  helperText?: string;
};

const EMPTY_DATA: Data = {
  root: { props: {} },
  content: [],
};

const parsePuckData = (raw?: string) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Data;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.content)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const toInitialData = (raw?: string) => {
  const parsed = parsePuckData(raw);
  if (parsed) return parsed;
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return EMPTY_DATA;
  return {
    ...EMPTY_DATA,
    content: [{ type: "Text", props: { title: "Content", body: trimmed, id: "legacy" } }],
  } as Data;
};

export function PuckEditor({ name, defaultValue = "", label, helperText }: Props) {
  const initialData = useMemo(() => toInitialData(defaultValue), [defaultValue]);
  const [data, setData] = useState<Data>(initialData);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));

  useEffect(() => {
    setData(initialData);
    setSerialized(JSON.stringify(initialData));
  }, [initialData]);

  return (
    <div className="space-y-2 text-sm">
      {label ? <span className="text-[color:var(--text-muted)]">{label}</span> : null}
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <Puck
          config={puckConfig}
          data={data}
          onChange={(next) => {
            setData(next);
            setSerialized(JSON.stringify(next));
          }}
        />
      </div>
      {helperText ? <p className="text-xs text-[color:var(--text-muted)]">{helperText}</p> : null}
      <textarea name={name} value={serialized} readOnly hidden />
    </div>
  );
}
