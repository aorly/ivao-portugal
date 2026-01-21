import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { getStaffPermissions, type StaffPermission } from "@/lib/staff";
import { getMenu, type MenuItemNode } from "@/lib/menu";
import { adminStaticRoutes } from "@/lib/admin-nav";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const staffPermissions = session?.user?.id ? await getStaffPermissions(session.user.id) : new Set<StaffPermission>();
  const canSee = (permission?: string | null) =>
    !permission || isAdmin || staffPermissions.has(permission as StaffPermission);
  const adminMenu = await getMenu("admin");
  const getLabel = (item: MenuItemNode) => (locale === "pt" && item.labelPt ? item.labelPt : item.label);
  const filterItems = (items: MenuItemNode[]): MenuItemNode[] => {
    const filtered: MenuItemNode[] = [];
    items.forEach((item) => {
      if (item.enabled === false) return;
      const children = filterItems(item.children ?? []);
      const canShowSelf = canSee(item.permission) && Boolean(item.href);
      if (!canShowSelf && children.length === 0) return;
      filtered.push({ ...item, children });
    });
    return filtered;
  };
  const visibleSections = filterItems(adminMenu);

  const flattenItems = (items: MenuItemNode[]): MenuItemNode[] =>
    items.flatMap((item) => (item.children?.length ? flattenItems(item.children) : [item]));
  const visibleLinks = flattenItems(visibleSections).filter((item) => Boolean(item.href));
  const menuRouteSet = new Set(visibleLinks.map((item) => item.href));
  const allowedRoutes = adminStaticRoutes.filter((route) => canSee(route.permission));
  const missingRoutes = allowedRoutes.filter((route) => !menuRouteSet.has(route.href));

  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [pageViews7d, ctaClicks7d, sessions24h] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: "page_view", createdAt: { gte: since7d } } }),
    prisma.analyticsEvent.count({ where: { eventType: "cta_click", createdAt: { gte: since7d } } }),
    prisma.analyticsEvent
      .findMany({
        where: { createdAt: { gte: since24h }, sessionId: { not: null } },
        select: { sessionId: true },
      })
      .then((rows) => new Set(rows.map((row) => row.sessionId)).size),
  ]);

  const renderItems = (items: MenuItemNode[]) => (
    <div className="space-y-3">
      {items.map((item) => {
        const children = item.children ?? [];
        if (children.length > 0) {
          return (
            <div key={item.id ?? item.label} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                {getLabel(item)}
              </p>
              <div className="space-y-2 border-l border-[color:var(--border)] pl-3">{renderItems(children)}</div>
            </div>
          );
        }
        const href = item.href ? `/${locale}${item.href}` : `/${locale}/admin`;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col gap-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-left transition hover:border-[color:var(--primary)] hover:shadow-[var(--shadow-soft)]"
          >
            <span className="text-sm font-semibold text-[color:var(--text-primary)]">{getLabel(item)}</span>
            <span className="text-[11px] text-[color:var(--text-muted)]">{href}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <main className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-4 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Views (7 days)
          </p>
          <p className="text-3xl font-semibold text-[color:var(--text-primary)]">{pageViews7d}</p>
          <p className="text-sm text-[color:var(--text-muted)]">Page views tracked across the site.</p>
        </Card>
        <Card className="space-y-2 p-4 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Interactions (7 days)
          </p>
          <p className="text-3xl font-semibold text-[color:var(--text-primary)]">{ctaClicks7d}</p>
          <p className="text-sm text-[color:var(--text-muted)]">CTA clicks captured in analytics.</p>
        </Card>
        <Card className="space-y-2 p-4 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Sessions (24h)
          </p>
          <p className="text-3xl font-semibold text-[color:var(--text-primary)]">{sessions24h}</p>
          <p className="text-sm text-[color:var(--text-muted)]">Unique recent visitor sessions.</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-2 p-4 md:p-6 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">Overview</p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">{t("cards.overview")}</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Jump straight into any admin area using the navigation or the list below. Each link already includes /{locale}
            in the path.
          </p>
        </Card>
        <Card className="space-y-3 p-4 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Missing routes
          </p>
          {missingRoutes.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">All admin routes are already linked.</p>
          ) : (
            <div className="space-y-2">
              {missingRoutes.map((route) => {
                const href = `/${locale}${route.href}`;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center justify-between rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--primary)] hover:shadow-[var(--shadow-soft)]"
                  >
                    <span>{route.label}</span>
                    <span className="text-[11px] text-[color:var(--text-muted)]">{href}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {visibleSections.map((section) => {
          const items = section.children?.length
            ? section.children
            : section.href
              ? [{ ...section, children: [] }]
            : [];
          if (items.length === 0) return null;
          const isWide = (section.label ?? "").toLowerCase().includes("content");
          const isTall = (section.label ?? "").toLowerCase().includes("infrastructure");
          return (
            <Card
              key={section.id ?? section.label}
              className={[
                "space-y-3 p-4 md:p-6",
                isWide ? "lg:col-span-2" : "",
                isTall ? "lg:row-span-2" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{getLabel(section)}</p>
                <span className="text-xs text-[color:var(--text-muted)]">{items.length} groups</span>
              </div>
              {renderItems(items)}
            </Card>
          );
        })}
      </div>
    </main>
  );
}
