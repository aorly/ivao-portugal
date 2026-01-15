import path from "path";
import fs from "fs/promises";
import { Card } from "@/components/ui/card";
import { type Locale, locales } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { TranslationsEditor } from "@/components/admin/translations-editor";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ locale?: string; ns?: string }>;
};

const getMessagesPath = (locale: Locale) => path.join(process.cwd(), "messages", `${locale}.json`);

const loadMessages = async (locale: Locale) => {
  const raw = await fs.readFile(getMessagesPath(locale), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
};

export default async function AdminTranslationsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:settings");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const sp = (await searchParams) ?? {};
  const requestedLocale = sp.locale && locales.includes(sp.locale as Locale) ? (sp.locale as Locale) : locale;
  const messages = await loadMessages(requestedLocale);
  const namespaces = Object.keys(messages).sort();
  const fallbackNamespace = namespaces[0] ?? "common";
  const selectedNamespace = sp.ns && namespaces.includes(sp.ns) ? sp.ns : fallbackNamespace;
  const selectedPayload = messages[selectedNamespace];
  const initialJson = JSON.stringify(selectedPayload ?? {}, null, 2);

  return (
    <main className="space-y-4">
      <Card className="space-y-4 p-4 md:p-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("translationsTitle")}</p>
          <p className="text-sm text-[color:var(--text-muted)]">{t("translationsDescription")}</p>
        </div>
        <div className="rounded-xl border border-[color:rgba(249,204,44,0.6)] bg-[color:rgba(249,204,44,0.18)] p-3 text-xs font-semibold text-[color:#4b3a00]">
          {t("translationsRestartWarning")}
        </div>
        <TranslationsEditor
          targetLocale={requestedLocale}
          namespace={selectedNamespace}
          namespaces={namespaces}
          locales={locales}
          initialJson={initialJson}
          labels={{
            locale: t("translationsLocale"),
            namespace: t("translationsNamespace"),
            jsonLabel: t("translationsJsonLabel"),
            helper: t("translationsHelper", { locale: requestedLocale }),
            save: t("translationsSave"),
          }}
        />
      </Card>
    </main>
  );
}
