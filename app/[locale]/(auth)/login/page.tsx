import { getTranslations } from "next-intl/server";
import { IvaoSignInButton } from "@/components/auth/ivao-sign-in";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Card className="space-y-4">
        <p className="text-sm text-[color:var(--text-muted)]">{t("placeholder")}</p>
        <IvaoSignInButton label={t("button")} callbackUrl={`/${locale}/home`} />
      </Card>
    </main>
  );
}
