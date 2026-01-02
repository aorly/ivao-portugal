import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { getMenu } from "@/lib/menu";
import { saveMenuTree } from "../actions";
import { MenuEditor } from "@/components/admin/menu-editor";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminAdminMenuPage({ params }: Props) {
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

  const adminMenu = await getMenu("admin");

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Admin menu</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Edit dashboard navigation for staff and admin roles.
        </p>
      </Card>
      <Card className="space-y-4 p-4">
        <MenuEditor locale={locale} menuKey="admin" initialItems={adminMenu} onSave={saveMenuTree} />
      </Card>
    </main>
  );
}
