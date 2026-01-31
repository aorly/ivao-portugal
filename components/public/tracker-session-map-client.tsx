"use client";

import dynamic from "next/dynamic";

const TrackerSessionMap = dynamic(
  () => import("@/components/public/tracker-session-map").then((mod) => mod.TrackerSessionMap),
  {
    ssr: false,
    loading: () => <div className="h-80 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
  },
);

type Props = {
  points: Array<{ lat: number; lon: number; alt: number | null; onGround: boolean; timestamp: string | null }>;
  boundaries: Array<{ id: string; label: string; points: Array<{ lat: number; lon: number }> }>;
  className?: string;
};

export function TrackerSessionMapClient({ points, boundaries, className }: Props) {
  return <TrackerSessionMap points={points} boundaries={boundaries} className={className} />;
}
