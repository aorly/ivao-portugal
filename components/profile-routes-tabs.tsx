"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

const ProfileStatsRoutesMap = dynamic(
  () => import("@/components/profile-stats-routes-map").then((mod) => mod.ProfileStatsRoutesMap),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]" />,
  },
);

type Route = {
  from: [number, number];
  to: [number, number];
  count: number;
  fromIcao: string;
  toIcao: string;
};

type Props = {
  allRoutes: Route[];
  lastMonthRoutes: Route[];
  lastYearRoutes: Route[];
};

export function ProfileRoutesTabs({ allRoutes, lastMonthRoutes, lastYearRoutes }: Props) {
  const [active, setActive] = useState<"all" | "month" | "year">("all");
  const activeRoutes = useMemo(() => {
    if (active === "month") return lastMonthRoutes;
    if (active === "year") return lastYearRoutes;
    return allRoutes;
  }, [active, allRoutes, lastMonthRoutes, lastYearRoutes]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive("all")}
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${
            active === "all"
              ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--text-primary)]"
              : "border-[color:var(--border)] text-[color:var(--text-muted)]"
          }`}
        >
          All routes
        </button>
        <button
          type="button"
          onClick={() => setActive("month")}
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${
            active === "month"
              ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--text-primary)]"
              : "border-[color:var(--border)] text-[color:var(--text-muted)]"
          }`}
        >
          Last month
        </button>
        <button
          type="button"
          onClick={() => setActive("year")}
          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] ${
            active === "year"
              ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--text-primary)]"
              : "border-[color:var(--border)] text-[color:var(--text-muted)]"
          }`}
        >
          Last year
        </button>
      </div>
      {activeRoutes.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">No routes for this period.</p>
      ) : (
        <ProfileStatsRoutesMap routes={activeRoutes} />
      )}
    </div>
  );
}
