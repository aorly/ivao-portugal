import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function CookiePolicyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cookie" });

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader title={t("policyTitle")} description={t("policyIntro")} />
      <Card className="space-y-4 p-5 text-sm text-[color:var(--text-muted)]">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("essentialTitle")}</p>
          <p>{t("essentialBody")}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("preferencesTitle")}</p>
          <p>{t("preferencesBody")}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("analyticsTitle")}</p>
          <p>{t("analyticsBody")}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("manageTitle")}</p>
          <p>{t("manageBody")}</p>
        </div>
      </Card>
    </main>
  );
}
