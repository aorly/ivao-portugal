"use client";

import dynamic from "next/dynamic";

const PuckRenderer = dynamic(() => import("@/components/puck/puck-renderer").then((mod) => mod.PuckRenderer), {
  ssr: false,
  loading: () => <div className="h-64 w-full rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
});

type Props = {
  data: import("@measured/puck").Data;
};

export function PuckRendererClient({ data }: Props) {
  return <PuckRenderer data={data} />;
}
