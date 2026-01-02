import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { getSiteConfig, saveSiteConfig } from "@/lib/site-config";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminSettingsPage({ params }: Props) {
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

  const config = await getSiteConfig();

  return (
    <main className="space-y-4">
      <Card className="space-y-4 p-4 md:p-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Division settings</p>
          <p className="text-sm text-[color:var(--text-muted)]">Update branding and division metadata.</p>
        </div>
        <form
          action={async (formData) => {
            "use server";
            await saveSiteConfig({
              divisionName: String(formData.get("divisionName") ?? "").trim(),
              divisionShortName: String(formData.get("divisionShortName") ?? "").trim(),
              countries: String(formData.get("countries") ?? "").trim(),
              logoFullUrl: String(formData.get("logoFullUrl") ?? "").trim(),
              logoCompactUrl: String(formData.get("logoCompactUrl") ?? "").trim(),
              footerTagline: String(formData.get("footerTagline") ?? "").trim(),
              supportEmail: String(formData.get("supportEmail") ?? "").trim(),
              websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
            });
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Division name</span>
              <input
                name="divisionName"
                defaultValue={config.divisionName}
                required
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Short name</span>
              <input
                name="divisionShortName"
                defaultValue={config.divisionShortName}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Countries</span>
            <input
              name="countries"
              defaultValue={config.countries}
              placeholder="Portugal, Spain"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Logo (full)</span>
              <input
                name="logoFullUrl"
                defaultValue={config.logoFullUrl}
                placeholder="https://..."
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Logo (compact)</span>
              <input
                name="logoCompactUrl"
                defaultValue={config.logoCompactUrl}
                placeholder="https://..."
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Footer tagline</span>
            <input
              name="footerTagline"
              defaultValue={config.footerTagline}
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Support email</span>
              <input
                name="supportEmail"
                defaultValue={config.supportEmail}
                placeholder="support@example.com"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Website URL</span>
              <input
                name="websiteUrl"
                defaultValue={config.websiteUrl}
                placeholder="https://ivao.pt"
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
