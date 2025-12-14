import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminIndexPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card className="p-4 space-y-1">
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.overview")}</p>
      </Card>
      <Card className="p-4 space-y-1">
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.events")}</p>
      </Card>
      <Card className="p-4 space-y-2">
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.airports")}</p>
        <a href={`/${locale}/admin/frequencies`} className="text-xs text-[color:var(--primary)] underline">
          {t("frequencies")}
        </a>
      </Card>
      <Card className="p-4 space-y-2">
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.training")}</p>
      </Card>
      <Card className="p-4 space-y-2 md:col-span-2">
        <p className="text-sm text-[color:var(--text-muted)]">AIRAC data</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a href={`/${locale}/admin/airac`} className="rounded border border-[color:var(--border)] px-3 py-1 text-[color:var(--primary)] underline">
            Fixes
          </a>
        </div>
      </Card>
    </main>
  );
}
