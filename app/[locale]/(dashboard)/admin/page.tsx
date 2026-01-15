import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { adminDetailRoutes, adminNavSections } from "@/lib/admin-nav";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { getStaffPermissions, type StaffPermission } from "@/lib/staff";

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
  const visibleSections = adminNavSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canSee(item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4 md:p-6">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.overview")}</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Jump straight into any admin area using the navigation above. All admin routes are listed below with their
          locale-aware URLs.
        </p>
      </Card>

      {visibleSections.map((section) => (
        <Card key={section.title} className="space-y-3 p-4 md:p-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{section.title}</p>
              {section.description ? (
                <p className="text-sm text-[color:var(--text-muted)]">{section.description}</p>
              ) : null}
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">Paths already include /{locale}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => {
              const href = `/${locale}${item.href}`;
              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 transition hover:-translate-y-[1px] hover:border-[color:var(--primary)] hover:shadow-[var(--shadow-soft)]"
                >
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{item.label}</p>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">{item.description}</p>
                  <p className="mt-3 text-[11px] text-[color:var(--primary)]">{href}</p>
                </Link>
              );
            })}
          </div>
        </Card>
      ))}

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
