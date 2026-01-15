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
import { RatingBadgesEditor } from "@/components/admin/rating-badges-editor";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ saved?: string }>;
};

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "public");
const BADGE_DIR = "badges";
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/svg+xml": ".svg",
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

export default async function AdminRatingsPage({ params, searchParams }: Props) {
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
  const sp = (await searchParams) ?? {};
  const saved = sp.saved === "1";

  return (
    <main className="space-y-4">
      <Card className="space-y-4 p-4 md:p-6">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Rating badges</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Create rating badges using a tag like PP or APC. Uploaded PNG/SVG files are stored in the public badges folder.
          </p>
        </div>
        {saved ? (
          <div className="rounded-xl border border-[color:rgba(46,198,98,0.4)] bg-[color:rgba(46,198,98,0.12)] px-3 py-2 text-xs font-semibold text-[color:#0b3c1e]">
            Settings saved.
          </div>
        ) : null}
        <form
          action={async (formData) => {
            "use server";
            const count = Number(formData.get("badgeCount") ?? 0);
            const ratingBadgesCustom: Record<string, string> = {};

            for (let i = 0; i < count; i += 1) {
              const tag = String(formData.get(`badgeTag_${i}`) ?? "").trim();
              if (!tag) continue;
              const uploaded =
                (await saveUpload(formData.get(`badgeFile_${i}`), BADGE_DIR)) ??
                String(formData.get(`badgeUrl_${i}`) ?? "").trim();
              if (!uploaded) continue;
              ratingBadgesCustom[tag.toUpperCase()] = uploaded;
            }

            await saveSiteConfig({
              divisionName: config.divisionName,
              divisionShortName: config.divisionShortName,
              countries: config.countries,
              divisionId: config.divisionId,
              logoFullUrl: config.logoFullUrl,
              logoCompactUrl: config.logoCompactUrl,
              logoFullDarkUrl: config.logoFullDarkUrl,
              logoCompactDarkUrl: config.logoCompactDarkUrl,
              footerTagline: config.footerTagline,
              supportEmail: config.supportEmail,
              websiteUrl: config.websiteUrl,
              faviconIcoUrl: config.faviconIcoUrl,
              favicon16Url: config.favicon16Url,
              favicon32Url: config.favicon32Url,
              favicon192Url: config.favicon192Url,
              favicon512Url: config.favicon512Url,
              appleTouchIconUrl: config.appleTouchIconUrl,
              maskIconUrl: config.maskIconUrl,
              socialImageUrl: config.socialImageUrl,
              ratingBadgesPilot: config.ratingBadgesPilot,
              ratingBadgesAtc: config.ratingBadgesAtc,
              ratingBadgesNetwork: config.ratingBadgesNetwork,
              ratingBadgesCustom,
            });
            revalidatePath(`/${locale}/admin/settings/ratings`);
            redirect(`/${locale}/admin/settings/ratings?saved=1`);
          }}
          className="space-y-4"
        >
          <RatingBadgesEditor initialBadges={config.ratingBadgesCustom ?? {}} />
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Save badges
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
