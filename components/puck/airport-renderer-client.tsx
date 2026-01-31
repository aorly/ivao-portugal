"use client";

import dynamic from "next/dynamic";
import type { AirportLayoutData } from "@/components/puck/airport-context";

const AirportPuckRenderer = dynamic(
  () => import("@/components/puck/airport-renderer").then((mod) => mod.AirportPuckRenderer),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
  },
);

type Props = {
  data: import("@measured/puck").Data;
  context: AirportLayoutData;
};

export function AirportPuckRendererClient({ data, context }: Props) {
  return <AirportPuckRenderer data={data} context={context} />;
}
