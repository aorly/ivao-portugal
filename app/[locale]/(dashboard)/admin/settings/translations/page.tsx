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
  const filePath = getMessagesPath(locale);
  const raw = await fs.readFile(filePath, "utf8");
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error) {
    console.error("[translations] Failed to parse messages file", { locale, filePath, error });
    return {};
  }
};

const scanNamespaces = async (rootDir: string) => {
  const namespaces = new Set<string>();
  const pattern =
    /namespace:\s*["']([^"']+)["']|useTranslations\(\s*["']([^"']+)["']|getTranslations\(\s*["']([^"']+)["']/g;

  const walk = async (dir: string) => {
    let entries: Array<{ name: string; isDirectory: () => boolean }> = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
        continue;
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) continue;
      let text = "";
      try {
        text = await fs.readFile(entryPath, "utf8");
      } catch {
        continue;
      }
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text))) {
        const value = match[1] ?? match[2] ?? match[3];
        if (value) namespaces.add(value);
      }
    }
  };

  await walk(rootDir);
  return namespaces;
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
  const allMessages = await Promise.all(locales.map((entry) => loadMessages(entry)));
  const namespaceSet = new Set<string>();
  allMessages.forEach((entry) => {
    Object.keys(entry).forEach((key) => namespaceSet.add(key));
  });
  const codeNamespaces = await scanNamespaces(path.join(process.cwd(), "app"));
  const componentNamespaces = await scanNamespaces(path.join(process.cwd(), "components"));
  const libNamespaces = await scanNamespaces(path.join(process.cwd(), "lib"));
  const dataNamespaces = await scanNamespaces(path.join(process.cwd(), "data"));
  codeNamespaces.forEach((entry) => namespaceSet.add(entry));
  componentNamespaces.forEach((entry) => namespaceSet.add(entry));
  libNamespaces.forEach((entry) => namespaceSet.add(entry));
  dataNamespaces.forEach((entry) => namespaceSet.add(entry));
  if (namespaceSet.size === 0) {
    namespaceSet.add("common");
  }
  const namespaces = Array.from(namespaceSet).sort();
  const fallbackNamespace = namespaces.includes("common") ? "common" : namespaces[0] ?? "common";
  const selectedNamespace = sp.ns && namespaces.includes(sp.ns) ? sp.ns : fallbackNamespace;
  const selectedPayload = messages[selectedNamespace] ?? {};
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
          locales={Array.from(locales)}
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
