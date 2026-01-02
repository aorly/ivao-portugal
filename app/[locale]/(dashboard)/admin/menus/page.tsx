import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { getMenu } from "@/lib/menu";
import { saveMenuTree } from "./actions";
import { MenuSections } from "@/components/admin/menu-sections";

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

  const [publicMenu, adminMenu, footerMenu] = await Promise.all([
    getMenu("public"),
    getMenu("admin"),
    getMenu("footer"),
  ]);

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Menus</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Use the tabs to edit public, admin, or footer navigation.
        </p>
      </Card>
      <Card className="space-y-4 p-4">
        <MenuSections
          locale={locale}
          publicMenu={publicMenu}
          adminMenu={adminMenu}
          footerMenu={footerMenu}
          onSave={saveMenuTree}
        />
      </Card>
    </main>
  );
}
