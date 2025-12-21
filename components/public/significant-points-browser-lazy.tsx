"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import type { SignificantPoint } from "@/lib/significant-points";

const SignificantPointsBrowser = dynamic(
  () => import("./significant-points-browser").then((m) => m.SignificantPointsBrowser),
  {
    ssr: false,
    loading: () => (
      <Card className="p-4 text-sm text-[color:var(--text-muted)]">Loading points…</Card>
    ),
  },
);

export function SignificantPointsBrowserLazy({ points }: { points: SignificantPoint[] }) {
  return <SignificantPointsBrowser points={points} />;
}
