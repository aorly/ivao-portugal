import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminMenusPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:menus");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Menus</p>
        <p className="text-sm text-[color:var(--text-muted)]">Choose which menu you want to edit.</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/${locale}/admin/menus/public`}
          className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--primary)]"
        >
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Public menu</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Edit the main site navigation and mega menus.
          </p>
          <p className="mt-3 text-xs text-[color:var(--text-muted)] transition group-hover:text-[color:var(--text-primary)]">
            Open editor →
          </p>
        </Link>
        <Link
          href={`/${locale}/admin/menus/admin`}
          className="group rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[color:var(--primary)]"
        >
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Admin menu</p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Control dashboard navigation for staff.
          </p>
          <p className="mt-3 text-xs text-[color:var(--text-muted)] transition group-hover:text-[color:var(--text-primary)]">
            Open editor →
          </p>
        </Link>
      </div>
    </main>
  );
}
