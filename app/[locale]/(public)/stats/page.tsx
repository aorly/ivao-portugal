import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DragScroll } from "@/components/ui/drag-scroll";
import { ProfileMonthlySync } from "@/components/profile-monthly-sync";
import { ProfileStatsCharts } from "@/components/profile-stats-charts";
import { ProfileRoutesTabs } from "@/components/profile-routes-tabs";
import { syncAllMonthlyUserStatsAction, syncMonthlyUserStatsAction } from "@/app/[locale]/(dashboard)/profile/actions";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds || !Number.isFinite(seconds)) return "0m";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const aggregateBy = (
  details: Array<{ type: string; key: string; count: number; timeSeconds: number }>,
  type: string,
  mode: "count" | "time",
): { key: string; value: number } | null => {
  const totals = new Map<string, number>();
  details
    .filter((item) => item.type === type)
    .forEach((item) => {
      const value = mode === "time" ? item.timeSeconds : item.count;
      totals.set(item.key, (totals.get(item.key) ?? 0) + value);
    });
  let top: { key: string; value: number } | null = null;
  totals.forEach((value, key) => {
    if (!top || value > top.value) top = { key, value };
  });
  return top;
};

const listByTime = (
  details: Array<{ type: string; key: string; timeSeconds: number }>,
  type: string,
  limit = 10,
) => {
  const totals = new Map<string, number>();
  details
    .filter((item) => item.type === type)
    .forEach((item) => {
      totals.set(item.key, (totals.get(item.key) ?? 0) + item.timeSeconds);
    });
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
};

const listByCount = (
  details: Array<{ type: string; key: string; count: number }>,
  type: string,
  limit = 10,
) => {
  const totals = new Map<string, number>();
  details
    .filter((item) => item.type === type)
    .forEach((item) => {
      totals.set(item.key, (totals.get(item.key) ?? 0) + item.count);
    });
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({ key, value }));
};

export default async function StatsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const session = await auth();
  if (!session?.user?.id || !session.user.vid) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-8">
        <Card className="space-y-3 p-6">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Stats</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Sign in with IVAO to see your personal stats.
          </p>
          <Link href={`/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/stats`)}`}>
            <Button size="sm">{t("ctaJoin")}</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const now = new Date();
  const recentMonths = Array.from({ length: 12 }, (_, idx) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (idx + 1), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
  const syncMonths = recentMonths.map((month) => ({ ...month, isCurrent: false }));

  const monthlyStats = await prisma.monthlyUserStat.findMany({
    where: { userId: session.user.id, monthKey: { in: recentMonths.map((month) => month.key) } },
    orderBy: { monthKey: "desc" },
  });
  const monthlyStatsMap = new Map(monthlyStats.map((stat) => [stat.monthKey, stat]));
  const detailStats = await prisma.monthlyUserStatDetail.findMany({
    where: { userId: session.user.id },
  });
  const currentYearKey = String(now.getUTCFullYear());
  const yearDetailStats = detailStats.filter((stat) => stat.monthKey.startsWith(`${currentYearKey}-`));

  const allTimeAircraft = aggregateBy(detailStats, "AIRCRAFT", "time");
  const allTimeRoute = aggregateBy(detailStats, "ROUTE", "count");
  const allTimeAirport = aggregateBy(detailStats, "AIRPORT", "count");
  const allTimePosition = aggregateBy(detailStats, "POSITION", "time");
  const yearAircraft = aggregateBy(yearDetailStats, "AIRCRAFT", "time");
  const yearRoute = aggregateBy(yearDetailStats, "ROUTE", "count");
  const yearAirport = aggregateBy(yearDetailStats, "AIRPORT", "count");
  const yearPosition = aggregateBy(yearDetailStats, "POSITION", "time");
  const aircraftByTime = listByTime(detailStats, "AIRCRAFT", 12);
  const airportByCount = listByCount(detailStats, "AIRPORT", 6);
  const routeByCount = listByCount(detailStats, "ROUTE", 6);
  const positionByTime = listByTime(detailStats, "POSITION", 6);
  const aircraftByCount = listByCount(detailStats, "AIRCRAFT", 6);
  const lastMonthKey = recentMonths[0]?.key ?? "";
  const lastMonthDetails = detailStats.filter((stat) => stat.monthKey === lastMonthKey);
  const lastMonthAircraft = aggregateBy(lastMonthDetails, "AIRCRAFT", "time");
  const lastMonthRoute = aggregateBy(lastMonthDetails, "ROUTE", "count");
  const lastMonthAirport = aggregateBy(lastMonthDetails, "AIRPORT", "count");
  const lastMonthPosition = aggregateBy(lastMonthDetails, "POSITION", "time");
  const lastYearKey = String(now.getUTCFullYear() - 1);
  const lastYearDetails = detailStats.filter((stat) => stat.monthKey.startsWith(`${lastYearKey}-`));
  const latestMonthKey = detailStats.reduce((latest, stat) => (stat.monthKey > latest ? stat.monthKey : latest), "");
  const latestMonthLabel = latestMonthKey
    ? new Date(
        Date.UTC(Number(latestMonthKey.slice(0, 4)), Number(latestMonthKey.slice(5, 7)) - 1, 1),
      ).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : null;

  const totalSessions = monthlyStats.reduce((sum, stat) => sum + stat.sessionsTotalCount, 0);
  const totalPilotSessions = monthlyStats.reduce((sum, stat) => sum + stat.sessionsPilotCount, 0);
  const totalAtcSessions = monthlyStats.reduce((sum, stat) => sum + stat.sessionsAtcCount, 0);
  const totalPilotHours = detailStats
    .filter((stat) => stat.type === "AIRCRAFT")
    .reduce((sum, stat) => sum + stat.timeSeconds, 0);
  const totalAtcHours = detailStats
    .filter((stat) => stat.type === "POSITION")
    .reduce((sum, stat) => sum + stat.timeSeconds, 0);

  const pilotHoursByMonth = new Map<string, number>();
  const atcHoursByMonth = new Map<string, number>();
  detailStats.forEach((stat) => {
    if (stat.type === "AIRCRAFT") {
      pilotHoursByMonth.set(stat.monthKey, (pilotHoursByMonth.get(stat.monthKey) ?? 0) + stat.timeSeconds);
    }
    if (stat.type === "POSITION") {
      atcHoursByMonth.set(stat.monthKey, (atcHoursByMonth.get(stat.monthKey) ?? 0) + stat.timeSeconds);
    }
  });

  const buildRouteTotals = (details: Array<{ type: string; key: string; count: number }>) => {
    const totals = new Map<string, number>();
    details
      .filter((item) => item.type === "ROUTE")
      .forEach((item) => {
        totals.set(item.key, (totals.get(item.key) ?? 0) + item.count);
      });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  };

  const allRoutes = buildRouteTotals(detailStats);
  const lastMonthRoutes = buildRouteTotals(lastMonthDetails);
  const lastYearRoutes = buildRouteTotals(lastYearDetails);

  const routeIcaos = new Set(
    [...allRoutes, ...lastMonthRoutes, ...lastYearRoutes]
      .flatMap((route) => route.key.split("-"))
      .map((icao) => icao.trim().toUpperCase())
      .filter((icao) => /^[A-Z0-9]{3,4}$/.test(icao)),
  );
  const routeAirports = routeIcaos.size
    ? await prisma.airport.findMany({
        where: { icao: { in: [...routeIcaos] } },
        select: { icao: true, latitude: true, longitude: true },
      })
    : [];
  const airportCoords = new Map(
    routeAirports.map((airport) => [airport.icao, [airport.latitude, airport.longitude] as [number, number]]),
  );
  const missingIcaos = [...routeIcaos].filter((icao) => !airportCoords.has(icao));
  const fetchIvaoAirport = async (icao: string) => {
    const raw = await ivaoClient.getAirport(icao);
    if (!raw || typeof raw !== "object") return null;
    const data = (raw as { data?: unknown }).data ?? raw;
    const record = data as Record<string, unknown>;
    const latitude = typeof record.latitude === "number" && Number.isFinite(record.latitude) ? record.latitude : null;
    const longitude = typeof record.longitude === "number" && Number.isFinite(record.longitude) ? record.longitude : null;
    if (latitude === null || longitude === null) return null;
    return { icao, latitude, longitude };
  };
  if (missingIcaos.length) {
    const fetched = await Promise.all(missingIcaos.map((icao) => fetchIvaoAirport(icao)));
    fetched.forEach((airport) => {
      if (!airport) return;
      airportCoords.set(airport.icao, [airport.latitude, airport.longitude]);
    });
  }
  const buildRouteLines = (routes: Array<{ key: string; count: number }>) =>
    routes
      .map((route) => {
        const [dep, arr] = route.key.split("-");
        const from = airportCoords.get(dep);
        const to = airportCoords.get(arr);
        if (!from || !to) return null;
        return { from, to, count: route.count, fromIcao: dep, toIcao: arr };
      })
      .filter(
        (route): route is { from: [number, number]; to: [number, number]; count: number; fromIcao: string; toIcao: string } =>
          Boolean(route),
      );

  const routeLinesAll = buildRouteLines(allRoutes);
  const routeLinesMonth = buildRouteLines(lastMonthRoutes);
  const routeLinesYear = buildRouteLines(lastYearRoutes);
  const monthlyLabels = [...recentMonths].reverse().map((month) => month.label);
  const monthlyPilot = [...recentMonths]
    .reverse()
    .map((month) => monthlyStatsMap.get(month.key)?.sessionsPilotCount ?? 0);
  const monthlyAtc = [...recentMonths]
    .reverse()
    .map((month) => monthlyStatsMap.get(month.key)?.sessionsAtcCount ?? 0);
  const monthlyPilotHours = [...recentMonths]
    .reverse()
    .map((month) => Math.round((pilotHoursByMonth.get(month.key) ?? 0) / 3600));
  const monthlyAtcHours = [...recentMonths]
    .reverse()
    .map((month) => Math.round((atcHoursByMonth.get(month.key) ?? 0) / 3600));
  const aircraftTotalSeconds = aircraftByTime.reduce((sum, item) => sum + item.value, 0);
  const aircraftBars = aircraftByTime.slice(0, 10).map((item) => ({
    label: item.key,
    seconds: item.value,
    percent: aircraftTotalSeconds ? (item.value / aircraftTotalSeconds) * 100 : 0,
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-10">
      <section className="relative overflow-hidden rounded-[36px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 md:p-8">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(60,85,172,0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(13,44,153,0.3),transparent_68%)]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(126,162,214,0.25),transparent_70%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[color:var(--text-muted)]">Your recap</p>
            <p className="mt-3 text-3xl font-semibold text-[color:var(--text-primary)]">IVAO highlights</p>
            <p className="mt-2 max-w-xl text-sm text-[color:var(--text-muted)]">
              A recap of your flying and controlling history, pulled from synced months.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">All time</p>
                <p className="text-sm text-[color:var(--text-primary)]">
                  {allTimeAircraft ? `${allTimeAircraft.key} ${formatDuration(allTimeAircraft.value)}` : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Year</p>
                <p className="text-sm text-[color:var(--text-primary)]">
                  {yearAircraft ? `${yearAircraft.key} ${formatDuration(yearAircraft.value)}` : "--"}
                </p>
              </div>
              <ProfileMonthlySync
                months={syncMonths}
                stats={monthlyStats}
                locale={locale}
                canSync
                action={syncMonthlyUserStatsAction}
                syncAllAction={syncAllMonthlyUserStatsAction}
              />
              <Link href={`/${locale}/profile`}>
                <Button size="sm" variant="secondary">
                  Back to profile
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative min-h-[240px] overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(13,44,153,0.9),rgba(60,85,172,0.7),rgba(126,162,214,0.35))]">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.35),transparent_70%)]" />
            <div className="absolute -left-14 bottom-6 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.2),transparent_70%)]" />
            <div className="absolute inset-0 p-6 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-white/80">IVAO Portugal recap</p>
              <p className="mt-2 text-3xl font-semibold">Last month in the skies</p>
              <p className="mt-2 max-w-sm text-sm text-white/80">
                Your most flown routes, busiest airports, and standout sessions.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Swipe recap</p>
          <span className="text-xs text-[color:var(--text-muted)]">Scroll</span>
        </div>
        <DragScroll className="scrollbar-none -mx-2 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [scrollbar-color:transparent_transparent] cursor-grab active:cursor-grabbing scroll-smooth scroll-px-2">
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(13,44,153,0.2),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Last month</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--primary)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {monthlyStatsMap.get(lastMonthKey)?.sessionsTotalCount ?? 0} sessions
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              Pilot {monthlyStatsMap.get(lastMonthKey)?.sessionsPilotCount ?? 0} | ATC{" "}
              {monthlyStatsMap.get(lastMonthKey)?.sessionsAtcCount ?? 0}
            </p>
          </div>
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(60,85,172,0.2),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Top aircraft</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--accent)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {aggregateBy(lastMonthDetails, "AIRCRAFT", "time")?.key ?? "--"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Last month favorite</p>
          </div>
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(126,162,214,0.24),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Top route</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--brand-400)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {aggregateBy(lastMonthDetails, "ROUTE", "count")?.key ?? "--"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Last month</p>
          </div>
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(13,44,153,0.16),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">All time</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--primary)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {allTimeAirport ? `${allTimeAirport.key} ${allTimeAirport.value}` : "--"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Most flown airport</p>
          </div>
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(60,85,172,0.18),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Year recap</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--accent)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {yearRoute ? `${yearRoute.key}` : "--"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Most flown route</p>
          </div>
          <div className="min-w-[320px] snap-center transition-transform duration-300 rounded-[32px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(126,162,214,0.2),transparent_65%)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">All time</p>
              <span className="h-9 w-9 rounded-full bg-[color:var(--brand-400)]/20" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[color:var(--text-primary)]">
              {allTimePosition ? `${allTimePosition.key}` : "--"}
            </p>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">Most controlled</p>
          </div>
        </DragScroll>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Sessions synced</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{totalSessions}</p>
          <p className="text-xs text-[color:var(--text-muted)]">
            Pilot {totalPilotSessions} | ATC {totalAtcSessions}
          </p>
        </Card>
        <Card className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Pilot hours</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{formatDuration(totalPilotHours)}</p>
          <p className="text-xs text-[color:var(--text-muted)]">Across synced months</p>
        </Card>
        <Card className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">ATC hours</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{formatDuration(totalAtcHours)}</p>
          <p className="text-xs text-[color:var(--text-muted)]">Across synced months</p>
        </Card>
        <Card className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Most flown aircraft</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{allTimeAircraft?.key ?? "--"}</p>
          <p className="text-xs text-[color:var(--text-muted)]">
            {allTimeAircraft ? formatDuration(allTimeAircraft.value) : "No data yet"}
          </p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">All time highlights</p>
            {latestMonthLabel ? (
              <span className="text-xs text-[color:var(--text-muted)]">Latest sync: {latestMonthLabel}</span>
            ) : null}
          </div>
          <div className="grid gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Aircraft hours</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {allTimeAircraft ? `${allTimeAircraft.key} (${formatDuration(allTimeAircraft.value)})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown route</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {allTimeRoute ? `${allTimeRoute.key} (${allTimeRoute.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown airport</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {allTimeAirport ? `${allTimeAirport.key} (${allTimeAirport.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most controlled</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {allTimePosition ? `${allTimePosition.key} (${formatDuration(allTimePosition.value)})` : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            {now.getUTCFullYear()} highlights
          </p>
          <div className="grid gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Aircraft hours</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {yearAircraft ? `${yearAircraft.key} (${formatDuration(yearAircraft.value)})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown route</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {yearRoute ? `${yearRoute.key} (${yearRoute.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown airport</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {yearAirport ? `${yearAirport.key} (${yearAirport.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most controlled</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {yearPosition ? `${yearPosition.key} (${formatDuration(yearPosition.value)})` : "--"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Last month highlights</p>
          <div className="grid gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Aircraft hours</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {lastMonthAircraft ? `${lastMonthAircraft.key} (${formatDuration(lastMonthAircraft.value)})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Top route</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {lastMonthRoute ? `${lastMonthRoute.key} (${lastMonthRoute.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Top airport</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {lastMonthAirport ? `${lastMonthAirport.key} (${lastMonthAirport.value})` : "--"}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Top ATC</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {lastMonthPosition ? `${lastMonthPosition.key} (${formatDuration(lastMonthPosition.value)})` : "--"}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Charts & trends</p>
          <span className="text-xs text-[color:var(--text-muted)]">Last 12 months</span>
        </div>
        <ProfileStatsCharts
          monthly={{
            labels: monthlyLabels,
            pilot: monthlyPilot,
            atc: monthlyAtc,
            total: [],
            pilotHours: monthlyPilotHours,
            atcHours: monthlyAtcHours,
          }}
          share={{ pilot: totalPilotSessions, atc: totalAtcSessions }}
        />
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Aircraft hours</p>
            {aircraftTotalSeconds ? (
              <span className="text-xs text-[color:var(--text-muted)]">{formatDuration(aircraftTotalSeconds)}</span>
            ) : null}
          </div>
          {aircraftBars.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">Sync months to see aircraft hours.</p>
          ) : (
            <div className="space-y-2">
              {aircraftBars.map((item) => (
                <div key={item.label} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2">
                  <div className="flex items-center justify-between text-sm text-[color:var(--text-primary)]">
                    <span>{item.label}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">
                      {formatDuration(item.seconds)} | {item.percent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--primary)]/80"
                      style={{ width: `${Math.max(2, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top routes</p>
            <p className="text-xs text-[color:var(--text-muted)]">Most flown routes by sessions</p>
          </div>
          <div className="space-y-2">
            {routeByCount.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No route data yet.</p>
            ) : (
              routeByCount.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm text-[color:var(--text-primary)]">
                  <span>{item.key}</span>
                  <span className="text-xs text-[color:var(--text-muted)]">{item.value}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[color:var(--border)] pt-3">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top airports</p>
            <div className="mt-2 space-y-2">
              {airportByCount.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No airport data yet.</p>
              ) : (
                airportByCount.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm text-[color:var(--text-primary)]">
                    <span>{item.key}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top ATC positions</p>
            <p className="text-xs text-[color:var(--text-muted)]">By online time</p>
          </div>
          <div className="space-y-2">
            {positionByTime.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No ATC data yet.</p>
            ) : (
              positionByTime.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm text-[color:var(--text-primary)]">
                  <span>{item.key}</span>
                  <span className="text-xs text-[color:var(--text-muted)]">{formatDuration(item.value)}</span>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-[color:var(--border)] pt-3">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Most flown aircraft</p>
            <div className="mt-2 space-y-2">
              {aircraftByCount.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No aircraft data yet.</p>
              ) : (
                aircraftByCount.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm text-[color:var(--text-primary)]">
                    <span>{item.key}</span>
                    <span className="text-xs text-[color:var(--text-muted)]">{item.value}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </section>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">All routes</p>
          <span className="text-xs text-[color:var(--text-muted)]">{routeLinesAll.length} routes</span>
        </div>
        {routeLinesAll.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">Sync months to see your routes on the map.</p>
        ) : (
          <ProfileRoutesTabs allRoutes={routeLinesAll} lastMonthRoutes={routeLinesMonth} lastYearRoutes={routeLinesYear} />
        )}
      </Card>

    </main>
  );
}
