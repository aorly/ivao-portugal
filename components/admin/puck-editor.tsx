"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Config, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/components/puck/config";

type Props = {
  name: string;
  defaultValue?: string;
  label?: string;
  helperText?: string;
  formId?: string;
  config?: Config;
  rootDefaults?: Record<string, string>;
  rootFields?: Array<{ name: string; prop?: string }>;
  showRawJsonEditor?: boolean;
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

const applyRootDefaults = (data: Data, rootDefaults?: Record<string, string>) => {
  if (!rootDefaults || Object.keys(rootDefaults).length === 0) return data;
  const currentProps =
    data.root && typeof data.root === "object" && "props" in data.root
      ? ((data.root as { props?: Record<string, string> }).props ?? {})
      : {};
  return {
    ...data,
    root: {
      ...(data.root ?? { props: {} }),
      props: { ...rootDefaults, ...currentProps },
    },
  };
};

const normalizePuckIds = (data: Data) => {
  const used = new Set<string>();
  let counter = 1;
  const makeId = (type?: string) => `${type || "Block"}_${String(counter++).padStart(4, "0")}`;

  const walkValue = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walkItem(item));
    } else if (value && typeof value === "object") {
      const typed = value as { type?: string; props?: Record<string, unknown> };
      if (typed.type && typed.props) {
        walkItem(typed);
      } else {
        Object.values(value as Record<string, unknown>).forEach((child) => walkValue(child));
      }
    }
  };

  const walkItem = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    const typed = item as { type?: string; props?: Record<string, unknown> };
    typed.props = typed.props ?? {};
    const current = typeof typed.props.id === "string" ? typed.props.id : "";
    const nextId = !current || used.has(current) ? makeId(typed.type) : current;
    typed.props.id = nextId;
    used.add(nextId);
    Object.values(typed.props).forEach((child) => walkValue(child));
  };

  walkValue(data.content);
  walkValue(data.zones);
  return data;
};

const toInitialData = (raw?: string, rootDefaults?: Record<string, string>) => {
  const parsed = parsePuckData(raw);
  if (parsed) return normalizePuckIds(applyRootDefaults(parsed, rootDefaults));
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return normalizePuckIds(applyRootDefaults(EMPTY_DATA, rootDefaults));
  return normalizePuckIds(
    applyRootDefaults(
    {
    ...EMPTY_DATA,
    content: [{ type: "Text", props: { title: "Content", body: trimmed, id: "legacy" } }],
  } as Data,
    rootDefaults,
  ),
  );
};

export function PuckEditor({
  name,
  defaultValue = "",
  label,
  helperText,
  formId,
  config,
  rootDefaults,
  rootFields,
  showRawJsonEditor = false,
}: Props) {
  const initialData = useMemo(
    () => toInitialData(defaultValue, rootDefaults),
    [defaultValue, rootDefaults],
  );
  const [data, setData] = useState<Data>(initialData);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));
  const [rawError, setRawError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const rootProps =
    data.root && typeof data.root === "object" && "props" in data.root
      ? ((data.root as { props?: Record<string, string> }).props ?? {})
      : {};

  useEffect(() => {
    setData(initialData);
    setSerialized(JSON.stringify(initialData));
  }, [initialData]);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label ? <span className="text-[color:var(--text-muted)]">{label}</span> : null}
        {showRawJsonEditor ? (
          <button
            type="button"
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
            onClick={() => setShowRaw((prev) => !prev)}
          >
            {showRaw ? "Hide raw JSON" : "Show raw JSON"}
          </button>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <Puck
          config={config ?? puckConfig}
          data={data}
          onChange={(next) => {
            setData(next);
            setSerialized(JSON.stringify(next));
          }}
        />
      </div>
      {helperText ? <p className="text-xs text-[color:var(--text-muted)]">{helperText}</p> : null}
      <textarea name={name} value={serialized} readOnly hidden form={formId} />
      {formId && rootFields?.length
        ? rootFields.map((field) => {
            const prop = field.prop ?? field.name;
            const value = rootProps[prop] ?? "";
            return (
              <input
                key={field.name}
                type="hidden"
                name={field.name}
                value={value}
                form={formId}
                data-puck-root={prop}
              />
            );
          })
        : null}
      {showRawJsonEditor && showRaw ? (
        <div className="space-y-2">
          <textarea
            value={serialized}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSerialized(nextValue);
              const parsed = parsePuckData(nextValue);
            if (parsed) {
              const normalized = normalizePuckIds(parsed);
              setData(normalized);
              setSerialized(JSON.stringify(normalized));
              setRawError(null);
            } else {
              setRawError("Invalid JSON. Fix errors to apply changes.");
            }
            }}
            className="min-h-[220px] w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
          />
          {rawError ? <p className="text-xs text-[color:var(--danger)]">{rawError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
