import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type Props = {
  params: { locale: Locale };
};

export default async function AdminFirsPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: "admin" });

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.firs")}</p>
      </Card>
      <Card>
        <p className="text-sm text-[color:var(--text-muted)]">{t("cards.firForm")}</p>
      </Card>
    </main>
  );
}
