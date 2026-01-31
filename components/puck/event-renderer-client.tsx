"use client";

import dynamic from "next/dynamic";
import type { EventLayoutData } from "@/components/puck/event-context";

const EventPuckRenderer = dynamic(
  () => import("@/components/puck/event-renderer").then((mod) => mod.EventPuckRenderer),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
  },
);

type Props = {
  data: import("@measured/puck").Data;
  context: EventLayoutData;
};

export function EventPuckRendererClient({ data, context }: Props) {
  return <EventPuckRenderer data={data} context={context} />;
}
