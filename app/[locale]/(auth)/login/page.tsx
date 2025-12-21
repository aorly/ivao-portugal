import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import Link from "next/link";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  ivao_auth: "We could not exchange the IVAO code. Please try again.",
  ivao_profile: "We could not read your IVAO profile. Please try again.",
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: "login" });

  const callbackUrl = `/${locale}/home`;
  const signInUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const error = sp.error ? errorMessages[sp.error] ?? "Authentication failed. Please try again." : null;

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <Card className="space-y-4">
        <p className="text-sm text-[color:var(--text-muted)]">{t("placeholder")}</p>
        {error ? <p className="rounded-lg bg-[color:var(--danger)]/15 p-3 text-sm text-[color:var(--danger)]">{error}</p> : null}
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
