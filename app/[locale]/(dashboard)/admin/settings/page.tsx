import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { getSiteConfig, saveSiteConfig } from "@/lib/site-config";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import nodemailer from "nodemailer";
import { MetaIconsSection } from "@/components/admin/meta-icons-section";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ saved?: string }>;
};

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "public");
const ICON_DIR = "icons";
const SOCIAL_DIR = "social";
const BRAND_DIR = "branding";
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};


const saveUpload = async (entry: FormDataEntryValue | null, dir: string) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0) return null;
  if (file.size > MAX_UPLOAD_SIZE) return null;
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(UPLOAD_ROOT, dir);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${dir}/${filename}`;
};

export default async function AdminSettingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
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
  const saved = sp.saved === "1";
  const smtpTest = sp.smtp === "1";
  const smtpOk = sp.smtpOk === "1";
  const smtpError = sp.smtpError ? decodeURIComponent(sp.smtpError) : "";

  return (
    <main className="space-y-4">
      <Card className="space-y-4 p-4 md:p-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Division settings</p>
          <p className="text-sm text-[color:var(--text-muted)]">Update branding and division metadata.</p>
        </div>
        {saved ? (
          <div className="rounded-xl border border-[color:rgba(46,198,98,0.4)] bg-[color:rgba(46,198,98,0.12)] px-3 py-2 text-xs font-semibold text-[color:#0b3c1e]">
            Settings saved.
          </div>
        ) : null}
        {smtpTest ? (
          <div
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
              smtpOk
                ? "border-[color:rgba(46,198,98,0.4)] bg-[color:rgba(46,198,98,0.12)] text-[color:#0b3c1e]"
                : "border-[color:rgba(239,68,68,0.4)] bg-[color:rgba(239,68,68,0.12)] text-[color:#7f1d1d]"
            }`}
          >
            {smtpOk ? "SMTP connection ok." : `SMTP test failed${smtpError ? `: ${smtpError}` : "."}`}
          </div>
        ) : null}
        <form
          action={async (formData) => {
            "use server";
            const faviconIcoUrl =
              (await saveUpload(formData.get("faviconIcoFile"), ICON_DIR)) ??
              String(formData.get("faviconIcoUrl") ?? "").trim();
            const logoFullUrl =
              (await saveUpload(formData.get("logoFullFile"), BRAND_DIR)) ??
              String(formData.get("logoFullUrl") ?? "").trim();
            const logoCompactUrl =
              (await saveUpload(formData.get("logoCompactFile"), BRAND_DIR)) ??
              String(formData.get("logoCompactUrl") ?? "").trim();
            const logoFullDarkUrl =
              (await saveUpload(formData.get("logoFullDarkFile"), BRAND_DIR)) ??
              String(formData.get("logoFullDarkUrl") ?? "").trim();
            const logoCompactDarkUrl =
              (await saveUpload(formData.get("logoCompactDarkFile"), BRAND_DIR)) ??
              String(formData.get("logoCompactDarkUrl") ?? "").trim();
            const favicon16Url =
              (await saveUpload(formData.get("favicon16File"), ICON_DIR)) ??
              String(formData.get("favicon16Url") ?? "").trim();
            const favicon32Url =
              (await saveUpload(formData.get("favicon32File"), ICON_DIR)) ??
              String(formData.get("favicon32Url") ?? "").trim();
            const favicon192Url =
              (await saveUpload(formData.get("favicon192File"), ICON_DIR)) ??
              String(formData.get("favicon192Url") ?? "").trim();
            const favicon512Url =
              (await saveUpload(formData.get("favicon512File"), ICON_DIR)) ??
              String(formData.get("favicon512Url") ?? "").trim();
            const appleTouchIconUrl =
              (await saveUpload(formData.get("appleTouchIconFile"), ICON_DIR)) ??
              String(formData.get("appleTouchIconUrl") ?? "").trim();
            const maskIconUrl =
              (await saveUpload(formData.get("maskIconFile"), ICON_DIR)) ??
              String(formData.get("maskIconUrl") ?? "").trim();
            const socialImageUrl =
              (await saveUpload(formData.get("socialImageFile"), SOCIAL_DIR)) ??
              String(formData.get("socialImageUrl") ?? "").trim();
            await saveSiteConfig({
              divisionName: String(formData.get("divisionName") ?? "").trim(),
              divisionShortName: String(formData.get("divisionShortName") ?? "").trim(),
              countries: String(formData.get("countries") ?? "").trim(),
              divisionId: String(formData.get("divisionId") ?? "").trim().toUpperCase(),
              logoFullUrl,
              logoCompactUrl,
              logoFullDarkUrl,
              logoCompactDarkUrl,
              footerTagline: String(formData.get("footerTagline") ?? "").trim(),
              supportEmail: String(formData.get("supportEmail") ?? "").trim(),
              smtpHost: String(formData.get("smtpHost") ?? "").trim(),
              smtpPort: String(formData.get("smtpPort") ?? "").trim(),
              smtpUser: String(formData.get("smtpUser") ?? "").trim(),
              smtpPass: String(formData.get("smtpPass") ?? "").trim(),
              smtpFrom: String(formData.get("smtpFrom") ?? "").trim(),
              websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
              faviconIcoUrl,
              favicon16Url,
              favicon32Url,
              favicon192Url,
              favicon512Url,
              appleTouchIconUrl,
              maskIconUrl,
              socialImageUrl,
              ratingBadgesPilot: config.ratingBadgesPilot,
              ratingBadgesAtc: config.ratingBadgesAtc,
              ratingBadgesNetwork: config.ratingBadgesNetwork,
              ratingBadgesCustom: config.ratingBadgesCustom,
            });
            revalidatePath(`/${locale}/admin/settings`);
            redirect(`/${locale}/admin/settings?saved=1`);
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
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Division ID</span>
            <input
              name="divisionId"
              defaultValue={config.divisionId ?? "PT"}
              placeholder="PT"
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
              <input
                name="logoFullFile"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="w-full text-xs text-[color:var(--text-primary)]"
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
              <input
                name="logoCompactFile"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="w-full text-xs text-[color:var(--text-primary)]"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Logo (full, dark)</span>
              <input
                name="logoFullDarkUrl"
                defaultValue={config.logoFullDarkUrl}
                placeholder="https://..."
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="logoFullDarkFile"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="w-full text-xs text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Logo (compact, dark)</span>
              <input
                name="logoCompactDarkUrl"
                defaultValue={config.logoCompactDarkUrl}
                placeholder="https://..."
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="logoCompactDarkFile"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="w-full text-xs text-[color:var(--text-primary)]"
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
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">SMTP settings</p>
            <p className="text-xs text-[color:var(--text-muted)]">Used by feedback and notification emails.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">SMTP host</span>
                <input
                  name="smtpHost"
                  defaultValue={config.smtpHost}
                  placeholder="smtp.example.com"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">SMTP port</span>
                <input
                  name="smtpPort"
                  defaultValue={config.smtpPort}
                  placeholder="587"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">SMTP user</span>
                <input
                  name="smtpUser"
                  defaultValue={config.smtpUser}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-[color:var(--text-muted)]">SMTP password</span>
                <input
                  name="smtpPass"
                  type="password"
                  defaultValue={config.smtpPass}
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
              <label className="space-y-1 text-sm md:col-span-2">
                <span className="text-[color:var(--text-muted)]">SMTP from</span>
                <input
                  name="smtpFrom"
                  defaultValue={config.smtpFrom}
                  placeholder="IVAO PT <no-reply@ivao.aero>"
                  className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                />
              </label>
            </div>
            <form
              action={async () => {
                "use server";
                const cfg = await getSiteConfig();
                try {
                  const port = Number.parseInt(cfg.smtpPort, 10);
                  const transporter = nodemailer.createTransport({
                    host: cfg.smtpHost,
                    port: Number.isFinite(port) ? port : 587,
                    secure: port === 465,
                    auth: cfg.smtpUser && cfg.smtpPass ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
                  });
                  await transporter.verify();
                  redirect(`/${locale}/admin/settings?smtp=1&smtpOk=1`);
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Unknown error";
                  redirect(`/${locale}/admin/settings?smtp=1&smtpError=${encodeURIComponent(message)}`);
                }
              }}
              className="mt-4"
            >
              <Button type="submit" size="sm" variant="secondary">
                Test SMTP connection
              </Button>
            </form>
          </div>
          <MetaIconsSection config={config} />
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[color:var(--text-primary)]">Rating badges</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Configure custom rating badges with tags like PP or APC.
                </p>
              </div>
              <Link
                href={`/${locale}/admin/settings/ratings`}
                className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
              >
                Manage badges
              </Link>
            </div>
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
