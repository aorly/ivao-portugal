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
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.overview")}</p>
      </Card>
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.events")}</p>
      </Card>
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.airports")}</p>
      </Card>
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.training")}</p>
      </Card>
    </main>
  );
}
