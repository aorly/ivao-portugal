

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { type Locale, defaultLocale } from "@/i18n";
import { loadCmsPages, saveCmsPages, type CmsPage } from "@/lib/cms-pages";
const ensure_admin_pages = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:pages");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

function getString(formData: FormData, key: string) {
  return ((formData.get(key) as string | null) ?? "").trim();
}

export async function upsertCmsPage(formData: FormData, locale: Locale = defaultLocale) {
  await ensure_admin_pages();

  const rawSlug = getString(formData, "slug");
  const title = getString(formData, "title");
  const summary = getString(formData, "summary");
  const content = getString(formData, "content");
  const published = formData.get("published") === "on";

  if (!rawSlug || !title) {
    throw new Error("Slug and title are required");
  }

  const now = new Date().toISOString();
  const slug = rawSlug.replace(/\s+/g, "-").toLowerCase();
  const pages = await loadCmsPages();
  const existingIndex = pages.findIndex((p) => p.slug === slug && p.locale === locale);

  const base: CmsPage = existingIndex >= 0 ? pages[existingIndex] : null!;
  const nextPage: CmsPage = {
    slug,
    title,
    summary,
    content,
    published,
    locale,
    createdAt: existingIndex >= 0 ? base.createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    pages[existingIndex] = nextPage;
  } else {
    pages.push(nextPage);
  }

  await saveCmsPages(pages);
  revalidatePath(`/${locale}/admin/pages`);
  revalidatePath(`/${locale}/pages`);
  revalidatePath(`/${locale}/pages/${slug}`);
}

export async function deleteCmsPage(slug: string, locale: Locale = defaultLocale) {
  await ensure_admin_pages();
  const pages = await loadCmsPages();
  const next = pages.filter((p) => !(p.slug === slug && p.locale === locale));
  await saveCmsPages(next);
  revalidatePath(`/${locale}/admin/pages`);
  revalidatePath(`/${locale}/pages`);
  revalidatePath(`/${locale}/pages/${slug}`);
}
