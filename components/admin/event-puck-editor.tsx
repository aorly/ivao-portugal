"use client";

import { useEffect, useMemo, useState } from "react";
import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { eventPuckConfig, createDefaultEventLayout } from "@/components/puck/event-config";
import { EventProvider, type EventLayoutData } from "@/components/puck/event-context";

type Props = {
  name: string;
  defaultValue?: string | null;
  context: EventLayoutData;
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

export function EventPuckEditor({ name, defaultValue, context, formId }: Props) {
  const initialData = useMemo(() => {
    const parsed = parseLayout(defaultValue);
    if (parsed) return parsed;
    return createDefaultEventLayout({
      title: context.title,
      description: context.description,
      bannerUrl: context.bannerUrl ?? null,
    });
  }, [context, defaultValue]);

  const [data, setData] = useState<Data>(initialData);
  const [serialized, setSerialized] = useState(() => JSON.stringify(initialData));

  useEffect(() => {
    setData(initialData);
    setSerialized(JSON.stringify(initialData));
  }, [initialData]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <EventProvider value={context}>
          <Puck
            config={eventPuckConfig}
            data={data}
            onChange={(next) => {
              setData(next);
              setSerialized(JSON.stringify(next));
            }}
          />
        </EventProvider>
      </div>
      <textarea name={name} value={serialized} readOnly hidden form={formId} />
    </div>
  );
}
