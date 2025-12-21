import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { type Locale } from "@/i18n";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const session = await auth();

  const role = session?.user?.role ?? "USER";
  if (!session?.user || !["ADMIN", "STAFF"].includes(role)) {
    return (
      <main className="flex flex-col gap-6">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <Card>
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <AdminNav locale={locale} />
      {children}
    </div>
  );
}
