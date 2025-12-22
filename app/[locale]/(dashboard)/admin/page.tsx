import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { adminDetailRoutes } from "@/lib/admin-nav";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { getStaffPermissions, type StaffPermission } from "@/lib/staff";
import { getMenu, type MenuItemNode } from "@/lib/menu";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const staffPermissions = session?.user?.id ? await getStaffPermissions(session.user.id) : new Set<StaffPermission>();
  const canSee = (permission?: string) =>
    !permission || isAdmin || staffPermissions.has(permission as StaffPermission);
  const menuItems = await getMenu("admin");
  const flatten = (items: MenuItemNode[]): MenuItemNode[] =>
    items.flatMap((item) => (item.children?.length ? item.children : [item]));
  const getLabel = (item: MenuItemNode) =>
    locale === "pt" && item.labelPt ? item.labelPt : item.label;
  const primaryLinks = flatten(menuItems)
    .filter((item) => item.enabled !== false && canSee(item.permission))
    .filter((item) => item.href)
    .map((item) => ({
      label: getLabel(item),
      description: item.href ?? "",
      href: `/${locale}${item.href}`,
    }));

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4 md:p-6">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.overview")}</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Jump straight into any admin area using the navigation above. All admin routes are listed below with their
          locale-aware URLs.
        </p>
      </Card>

      <Card className="space-y-3 p-4 md:p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Primary pages</p>
            <p className="text-sm text-[color:var(--text-muted)]">One-click access to every admin tool.</p>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">Paths already include /{locale}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 transition hover:-translate-y-[1px] hover:border-[color:var(--primary)] hover:shadow-[var(--shadow-soft)]"
            >
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.label}</p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.description}</p>
              <p className="mt-3 text-[11px] text-[color:var(--primary)]">{item.href}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4 md:p-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Detail routes</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Use these patterns when linking to specific records from tables or lists.
          </p>
        </div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {adminDetailRoutes.map((route) => (
            <div
              key={route.path}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-[color:var(--text-muted)]"
            >
              <p className="text-xs font-semibold text-[color:var(--text-primary)]">/{locale}{route.path}</p>
              <p className="mt-1 text-xs">{route.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
