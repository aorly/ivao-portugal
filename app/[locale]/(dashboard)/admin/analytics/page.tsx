import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { getAnalyticsConfig } from "@/lib/analytics-config";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ range?: string }>;
};

export default async function AnalyticsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:analytics");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const sp = (await searchParams) ?? {};
  const rangeValue = Number(sp.range ?? 7);
  const rangeDays = Number.isFinite(rangeValue) && rangeValue > 0 ? Math.min(90, rangeValue) : 7;
  const since = new Date();
  since.setDate(since.getDate() - rangeDays);
  const analyticsConfig = await getAnalyticsConfig();
  const baseWhere = analyticsConfig.trackAdmin
    ? { createdAt: { gte: since } }
    : { createdAt: { gte: since }, path: { not: { contains: "/admin" } } };

  const [totalViews, totalCtas, topPages, topCtas, recent, eventsInRange, viewsByPath, ctasByPath] =
    await Promise.all([
    prisma.analyticsEvent.count({ where: { ...baseWhere, eventType: "page_view" } }),
    prisma.analyticsEvent.count({ where: { ...baseWhere, eventType: "cta_click" } }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { ...baseWhere, eventType: "page_view" },
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["label"],
      where: { ...baseWhere, eventType: "cta_click" },
      _count: { label: true },
      orderBy: { _count: { label: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.analyticsEvent.findMany({
      where: baseWhere,
      select: { eventType: true, createdAt: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { ...baseWhere, eventType: "page_view" },
      _count: { path: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: { ...baseWhere, eventType: "cta_click" },
      _count: { path: true },
    }),
  ]);

  const dayKey = (date: Date) => date.toISOString().slice(0, 10);
  const days = Array.from({ length: rangeDays }, (_, idx) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (rangeDays - 1 - idx));
    return d;
  });
  const dailyMap = new Map<string, { views: number; ctas: number }>(
    days.map((d) => [dayKey(d), { views: 0, ctas: 0 }]),
  );
  eventsInRange.forEach((event) => {
    const key = dayKey(event.createdAt);
    const row = dailyMap.get(key);
    if (!row) return;
    if (event.eventType === "page_view") row.views += 1;
    if (event.eventType === "cta_click") row.ctas += 1;
  });
  const dailySeries = days.map((d) => ({
    label: d.toLocaleDateString(locale, { month: "short", day: "numeric" }),
    views: dailyMap.get(dayKey(d))?.views ?? 0,
    ctas: dailyMap.get(dayKey(d))?.ctas ?? 0,
  }));
  const maxDaily = Math.max(1, ...dailySeries.map((row) => Math.max(row.views, row.ctas)));
  const viewMap = new Map(viewsByPath.map((row) => [row.path, row._count.path]));
  const ctaMap = new Map(ctasByPath.map((row) => [row.path, row._count.path]));
  const ctrRows = Array.from(viewMap.entries())
    .map(([path, views]) => {
      const ctas = ctaMap.get(path) ?? 0;
      return { path, views, ctas, ctr: views > 0 ? ctas / views : 0 };
    })
    .filter((row) => row.views >= 5)
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 6);

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
          Analytics (last {rangeDays} days)
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-[color:var(--text-muted)]">
          <span>Total page views: {totalViews}</span>
          <span>Total CTA clicks: {totalCtas}</span>
          <span>Locale: {locale}</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[7, 30, 90].map((range) => (
            <a
              key={range}
              href={`/${locale}/admin/analytics?range=${range}`}
              className={`rounded-full border px-3 py-1 ${
                rangeDays === range
                  ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                  : "border-[color:var(--border)] text-[color:var(--text-muted)]"
              }`}
            >
              {range}d
            </a>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Daily activity</p>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(12px,1fr))] gap-2"
          role="img"
          aria-label="Daily page views and CTA clicks"
        >
          {dailySeries.map((row) => {
            const viewHeight = Math.max(8, Math.round((row.views / maxDaily) * 64));
            const ctaHeight = Math.max(8, Math.round((row.ctas / maxDaily) * 64));
            return (
              <div key={row.label} className="flex flex-col items-center gap-2">
                <div className="flex items-end gap-1">
                  <span
                    className="w-2 rounded-md bg-[color:var(--primary)]/60"
                    style={{ height: `${viewHeight}px` }}
                    title={`Views: ${row.views}`}
                  />
                  <span
                    className="w-2 rounded-md bg-[color:var(--accent)]/70"
                    style={{ height: `${ctaHeight}px` }}
                    title={`CTAs: ${row.ctas}`}
                  />
                </div>
                <span className="text-[10px] text-[color:var(--text-muted)]">{row.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-[color:var(--text-muted)]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]/60" />
            Page views
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]/70" />
            CTA clicks
          </span>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top pages</p>
          {topPages.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No page views yet.</p>
          ) : (
            <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
              {topPages.map((row) => (
                <div key={row.path} className="flex items-center justify-between gap-2">
                  <span className="truncate">{row.path}</span>
                  <span className="text-[color:var(--text-primary)]">{row._count.path}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top CTA clicks</p>
          {topCtas.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No CTA clicks yet.</p>
          ) : (
            <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
              {topCtas.map((row) => (
                <div key={row.label ?? "unknown"} className="flex items-center justify-between gap-2">
                  <span className="truncate">{row.label ?? "Unknown"}</span>
                  <span className="text-[color:var(--text-primary)]">{row._count.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Top CTR (min 5 views)</p>
        {ctrRows.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">Not enough data yet.</p>
        ) : (
          <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
            {ctrRows.map((row) => (
              <div key={row.path} className="flex items-center justify-between gap-2">
                <span className="truncate">{row.path}</span>
                <span className="text-[color:var(--text-primary)]">
                  {(row.ctr * 100).toFixed(1)}% ({row.ctas}/{row.views})
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Recent events</p>
        {recent.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No analytics events captured.</p>
        ) : (
          <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
            {recent.map((event) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {event.eventType} {event.label ? `- ${event.label}` : ""}
                </span>
                <span className="text-[color:var(--text-primary)]">
                  {event.createdAt.toLocaleString(locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
