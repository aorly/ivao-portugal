import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import Link from "next/link";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "login" });

  const callbackUrl = `/${locale}/home`;
  const signInUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Card className="space-y-4">
        <p className="text-sm text-[color:var(--text-muted)]">{t("placeholder")}</p>
        <Link
          href={signInUrl}
          className="block w-full rounded-lg bg-[color:var(--primary)] px-3 py-2 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          {t("button")}
        </Link>
      </Card>
    </main>
  );
}
