"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { airportPuckConfig, createDefaultAirportLayout } from "@/components/puck/airport-config";
import { AirportProvider, type AirportLayoutData } from "@/components/puck/airport-context";

type Props = {
  name: string;
  defaultValue?: string | null;
  context: AirportLayoutData;
  formId?: string;
};

const parseLayout = (raw?: string | null) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Data;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.content)) return null;
    return parsed;
  } catch {
    return null;
  }
};

export function AirportPuckEditor({ name, defaultValue, context, formId }: Props) {
  const initialData = useMemo(() => {
    const parsed = parseLayout(defaultValue);
    if (parsed) return parsed;
    return createDefaultAirportLayout();
  }, [defaultValue]);

  const [data, setData] = useState<Data>(initialData);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));

  useEffect(() => {
    setData(initialData);
    setSerialized(JSON.stringify(initialData));
  }, [initialData]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <AirportProvider value={context}>
          <Puck
            config={airportPuckConfig}
            data={data}
            onChange={(next) => {
              setData(next);
              setSerialized(JSON.stringify(next));
            }}
          />
        </AirportProvider>
      </div>
      <textarea name={name} value={serialized} readOnly hidden form={formId} />
    </div>
  );
}
