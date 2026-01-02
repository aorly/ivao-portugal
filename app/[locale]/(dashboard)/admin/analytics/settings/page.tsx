import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { getAnalyticsConfig, saveAnalyticsConfig } from "@/lib/analytics-config";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import AnalyticsSettingsClient from "@/components/admin/analytics-settings-client";

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

  return <AnalyticsSettingsClient locale={locale} config={config} saveAction={saveAction} />;
}
