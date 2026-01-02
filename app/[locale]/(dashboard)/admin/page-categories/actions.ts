"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { locales } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { deleteCmsCategory, getCategoryPath, loadCmsCategories, upsertCmsCategory } from "@/lib/cms-categories";
import { loadCmsPages } from "@/lib/cms-pages";
import { logAudit } from "@/lib/audit";

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:pages");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

const buildCategorySnapshot = (
  category: Awaited<ReturnType<typeof loadCmsCategories>>[number] | null,
  categories: Awaited<ReturnType<typeof loadCmsCategories>>,
) => {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    parentId: category.parentId ?? null,
    path: getCategoryPath(categories, category.id).join("/"),
  };
};

const revalidateCategoryPaths = (categoryId: string, categories: Awaited<ReturnType<typeof loadCmsCategories>>) => {
  const path = getCategoryPath(categories, categoryId).join("/");
  locales.forEach((locale) => {
    revalidatePath(`/${locale}/${path}`);
  });
};

export async function upsertCategory(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = normalizeSlug(String(formData.get("slug") ?? name));
  const description = String(formData.get("description") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();

  const categories = await loadCmsCategories();
  const before = id ? categories.find((entry) => entry.id === id) ?? null : null;
  const next = await upsertCmsCategory({
    id: id || null,
    name,
    slug,
    description,
    parentId: parentId || null,
  });
  const updatedCategories = categories.some((entry) => entry.id === next.id)
    ? categories.map((entry) => (entry.id === next.id ? next : entry))
    : [...categories, next];
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: id ? "update" : "create",
    entityType: "cmsCategory",
    entityId: next.id,
    before: buildCategorySnapshot(before, categories),
    after: buildCategorySnapshot(next, updatedCategories),
  });

  revalidatePath(`/${formData.get("locale") ?? "en"}/admin/page-categories`);
  revalidatePath(`/${formData.get("locale") ?? "en"}/admin/pages`);
  revalidateCategoryPaths(next.id, updatedCategories);
  if (before) {
    revalidateCategoryPaths(before.id, categories);
  }
  const pages = await loadCmsPages();
  pages
    .filter((page) => page.categoryId === next.id)
    .forEach((page) => {
      const nextPath = getCategoryPath(categories, next.id).join("/");
      revalidatePath(`/${page.locale}/${nextPath}/${page.slug}`);
      if (before) {
        const beforePath = getCategoryPath(categories, before.id).join("/");
        revalidatePath(`/${page.locale}/${beforePath}/${page.slug}`);
      }
    });
}

export async function deleteCategory(formData: FormData) {
  const session = await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing category");

  const categories = await loadCmsCategories();
  const category = categories.find((entry) => entry.id === id) ?? null;
  await deleteCmsCategory(id);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "cmsCategory",
    entityId: id,
    before: buildCategorySnapshot(category, categories),
    after: null,
  });

  revalidatePath(`/${formData.get("locale") ?? "en"}/admin/page-categories`);
  revalidatePath(`/${formData.get("locale") ?? "en"}/admin/pages`);
  if (category) {
    revalidateCategoryPaths(category.id, categories);
    const pages = await loadCmsPages();
    pages
      .filter((page) => page.categoryId === category.id)
      .forEach((page) => {
        const categoryPath = getCategoryPath(categories, category.id).join("/");
        revalidatePath(`/${page.locale}/${categoryPath}/${page.slug}`);
      });
  }
}
