import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { getAnalyticsConfig, saveAnalyticsConfig } from "@/lib/analytics-config";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AnalyticsSettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:analytics");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const config = await getAnalyticsConfig();

  const saveAction = async (formData: FormData) => {
    "use server";
    const next = {
      ga4MeasurementId: String(formData.get("ga4MeasurementId") ?? "").trim(),
      umamiWebsiteId: String(formData.get("umamiWebsiteId") ?? "").trim(),
      umamiScriptUrl: String(formData.get("umamiScriptUrl") ?? "").trim(),
      plausibleDomain: String(formData.get("plausibleDomain") ?? "").trim(),
      plausibleScriptUrl: String(formData.get("plausibleScriptUrl") ?? "").trim(),
      trackAdmin: formData.get("trackAdmin") === "on",
    };
    await saveAnalyticsConfig(next);
  };

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Analytics settings</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Configure third-party analytics. Leave fields empty to disable a provider.
        </p>
      </Card>

      <Card className="space-y-4 p-4">
        <form action={saveAction} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">GA4 Measurement ID</span>
              <input
                name="ga4MeasurementId"
                defaultValue={config.ga4MeasurementId ?? ""}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Umami Website ID</span>
              <input
                name="umamiWebsiteId"
                defaultValue={config.umamiWebsiteId ?? ""}
                placeholder="UUID"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Umami Script URL</span>
              <input
                name="umamiScriptUrl"
                defaultValue={config.umamiScriptUrl ?? ""}
                placeholder="https://analytics.umami.is/script.js"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Plausible Domain</span>
              <input
                name="plausibleDomain"
                defaultValue={config.plausibleDomain ?? ""}
                placeholder="ivao-portugal.org"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Plausible Script URL</span>
            <input
              name="plausibleScriptUrl"
              defaultValue={config.plausibleScriptUrl ?? ""}
              placeholder="https://plausible.io/js/script.js"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input type="checkbox" name="trackAdmin" defaultChecked={Boolean(config.trackAdmin)} />
            <span>Track admin page views and CTA clicks</span>
          </label>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">
              Save settings
            </Button>
            <span className="text-xs text-[color:var(--text-muted)]">
              Current locale: {locale}
            </span>
          </div>
        </form>
      </Card>
    </main>
  );
}
