

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { type Locale, defaultLocale } from "@/i18n";
import { loadCmsPages, saveCmsPages, type CmsPage } from "@/lib/cms-pages";
import { getCategoryPath, loadCmsCategories } from "@/lib/cms-categories";
import { logAudit } from "@/lib/audit";
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

function parseTags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function parseContentRootProps(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { root?: { props?: Record<string, unknown> } } | null;
    if (!parsed || typeof parsed !== "object") return {};
    const props = parsed.root?.props;
    if (!props || typeof props !== "object") return {};
    return props;
  } catch {
    return {};
  }
}

function syncContentRootProps(raw: string, updates: Record<string, string>) {
  try {
    const parsed = JSON.parse(raw) as { root?: { props?: Record<string, unknown> } } | null;
    if (!parsed || typeof parsed !== "object") return raw;
    const root = parsed.root ?? {};
    const props = (root as { props?: Record<string, unknown> }).props ?? {};
    parsed.root = { ...root, props: { ...props, ...updates } };
    return JSON.stringify(parsed);
  } catch {
    return raw;
  }
}

function buildPageAuditSnapshot(page: CmsPage | null, categories: Awaited<ReturnType<typeof loadCmsCategories>>) {
  if (!page) return null;
  const categoryPath = page.categoryId ? getCategoryPath(categories, page.categoryId).join("/") : null;
  return {
    slug: page.slug,
    locale: page.locale,
    title: page.title,
    summary: page.summary ?? "",
    published: page.published,
    featured: page.featured ?? false,
    tags: page.tags ?? [],
    section: page.section ?? null,
    order: page.order ?? null,
    categoryId: page.categoryId ?? null,
    categoryPath,
    translationKey: page.translationKey ?? null,
    contentLength: page.content?.length ?? 0,
    updatedAt: page.updatedAt,
    createdAt: page.createdAt,
  };
}

function normalizePuckIds(data: { content?: unknown; zones?: Record<string, unknown> }) {
  const used = new Set<string>();
  let counter = 1;
  const makeId = (type?: string) => `${type || "Block"}_${String(counter++).padStart(4, "0")}`;

  const walkValue = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walkItem(item));
    } else if (value && typeof value === "object") {
      const typed = value as { type?: string; props?: Record<string, unknown> };
      if (typed.type && typed.props) {
        walkItem(typed);
      } else {
        Object.values(value as Record<string, unknown>).forEach((child) => walkValue(child));
      }
    }
  };

  const walkItem = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    const typed = item as { type?: string; props?: Record<string, unknown> };
    typed.props = typed.props ?? {};
    const current = typeof typed.props.id === "string" ? typed.props.id : "";
    const nextId = !current || used.has(current) ? makeId(typed.type) : current;
    typed.props.id = nextId;
    used.add(nextId);
    Object.values(typed.props).forEach((child) => walkValue(child));
  };

  walkValue(data.content);
  walkValue(data.zones);
}

function normalizePuckData(raw: string) {
  const parsed = JSON.parse(raw) as {
    root?: { props?: Record<string, unknown> };
    content?: unknown;
    zones?: Record<string, unknown>;
  };
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.content)) {
    throw new Error("Invalid Puck JSON");
  }
  parsed.root = parsed.root ?? { props: {} };
  parsed.root.props = parsed.root.props ?? {};

  const normalizeImages = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => normalizeImages(item));
    } else if (value && typeof value === "object") {
      const typed = value as { type?: string; props?: Record<string, unknown> };
      if (typed.type === "Image" && typed.props) {
        const url = typed.props.url;
        if (typeof url === "string" && !typed.props.src) {
          typed.props.src = url;
          delete typed.props.url;
        }
      }
      if (typed.props) {
        Object.values(typed.props).forEach((child) => normalizeImages(child));
      }
    }
  };

  normalizeImages(parsed.content);
  normalizeImages(parsed.zones ?? {});
  normalizePuckIds(parsed);
  return parsed;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function parseTagsValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return parseTags(value);
  }
  return [];
}

export async function upsertCmsPage(formData: FormData, locale: Locale = defaultLocale) {
  const session = await ensure_admin_pages();

  const originalSlug = getString(formData, "originalSlug");
  const rawSlug = getString(formData, "slug");
  const title = getString(formData, "title");
  const summary = getString(formData, "summary");
  let content = getString(formData, "content");
  const rootProps = parseContentRootProps(content);
  const publishedRaw = getString(formData, "published");
  const publishedRoot = typeof rootProps.published === "string" ? rootProps.published : "";
  const publishedValue = publishedRoot || publishedRaw;
  const published = publishedValue === "on" || publishedValue === "true";
  const featuredRaw = getString(formData, "featured");
  const featuredRoot = typeof rootProps.featured === "string" ? rootProps.featured : "";
  const featuredValue = featuredRoot || featuredRaw;
  const featured = featuredValue === "on" || featuredValue === "true";
  const tags = parseTags(getString(formData, "tags"));
  const section = getString(formData, "section");
  const orderValue = getString(formData, "order");
  const order = orderValue ? Number.parseInt(orderValue, 10) : NaN;
  let categoryId = getString(formData, "categoryId");
  const translationKeyRaw = getString(formData, "translationKey");

  if (!rawSlug || !title) {
    throw new Error("Slug and title are required");
  }

  const now = new Date().toISOString();
  const slug = rawSlug.replace(/\s+/g, "-").toLowerCase();
  const translationKey = (translationKeyRaw || slug).trim();
  const pages = await loadCmsPages();
  const existingIndex = pages.findIndex((p) => p.slug === slug && p.locale === locale);
  const originalIndex =
    originalSlug && originalSlug !== slug
      ? pages.findIndex((p) => p.slug === originalSlug && p.locale === locale)
      : -1;
  if (originalIndex >= 0 && existingIndex >= 0 && originalIndex !== existingIndex) {
    throw new Error("Slug already exists");
  }
  const targetIndex = originalIndex >= 0 ? originalIndex : existingIndex;
  const base: CmsPage | null = targetIndex >= 0 ? pages[targetIndex] : null;
  const categories = await loadCmsCategories();
  const categoryExists = categories.some((entry) => entry.id === categoryId);
  if (!categoryExists) {
    if (base?.categoryId) {
      categoryId = base.categoryId;
    } else if (categories[0]?.id) {
      categoryId = categories[0].id;
    }
  }
  if (!categoryId) {
    throw new Error("Category is required");
  }

  content = syncContentRootProps(content, {
    slug,
    title,
    summary,
    translationKey,
    categoryId,
    tags: tags.join(", "),
    section,
    order: Number.isFinite(order) ? String(order) : "",
    featured: featured ? "true" : "false",
    published: published ? "true" : "false",
  });

  const nextPage: CmsPage = {
    slug,
    title,
    summary,
    content,
    published,
    featured,
    locale,
    tags,
    section: section || null,
    order: Number.isFinite(order) ? order : null,
    categoryId,
    translationKey,
    createdAt: base ? base.createdAt : now,
    updatedAt: now,
  };

  if (targetIndex >= 0) {
    pages[targetIndex] = nextPage;
  } else {
    pages.push(nextPage);
  }

  await saveCmsPages(pages);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: targetIndex >= 0 ? "update" : "create",
    entityType: "cmsPage",
    entityId: `${locale}:${slug}`,
    before: base ? buildPageAuditSnapshot(base, categories) : null,
    after: buildPageAuditSnapshot(nextPage, categories),
  });
  revalidatePath(`/${locale}/admin/pages`);
  const category = categories.find((entry) => entry.id === categoryId);
  if (category) {
    const categoryPath = getCategoryPath(categories, category.id).join("/");
    revalidatePath(`/${locale}/${categoryPath}`);
    revalidatePath(`/${locale}/${categoryPath}/${slug}`);
  }
}

export async function createCmsPageFromJson(formData: FormData, locale: Locale = defaultLocale) {
  const session = await ensure_admin_pages();

  const raw = getString(formData, "puckJson");
  if (!raw) {
    throw new Error("Puck JSON is required");
  }

  const normalized = normalizePuckData(raw);
  const rootProps = normalized.root?.props ?? {};
  const title = typeof rootProps.title === "string" ? rootProps.title.trim() : "";
  const summary = typeof rootProps.summary === "string" ? rootProps.summary.trim() : "";
  const tags = parseTagsValue(rootProps.tags);
  const translationKey =
    typeof rootProps.translationKey === "string" && rootProps.translationKey.trim()
      ? rootProps.translationKey.trim()
      : "";
  const section = typeof rootProps.section === "string" ? rootProps.section.trim() : "";
  const orderValue =
    typeof rootProps.order === "number"
      ? String(rootProps.order)
      : typeof rootProps.order === "string"
        ? rootProps.order.trim()
        : "";
  const order = orderValue ? Number.parseInt(orderValue, 10) : NaN;
  const published = rootProps.published === "true" || rootProps.published === true;
  const featured = rootProps.featured === "true" || rootProps.featured === true;
  const categoryIdRaw = typeof rootProps.categoryId === "string" ? rootProps.categoryId.trim() : "";

  const categories = await loadCmsCategories();
  const categoryExists = categories.some((entry) => entry.id === categoryIdRaw);
  const categoryId = categoryExists ? categoryIdRaw : categories[0]?.id ?? "";
  if (!categoryId) {
    throw new Error("Category is required");
  }

  const baseSlug =
    typeof rootProps.slug === "string" && rootProps.slug.trim()
      ? slugify(rootProps.slug)
      : slugify(title || "imported-page");
  if (!baseSlug) {
    throw new Error("Slug is required");
  }

  const pages = await loadCmsPages();
  let slug = baseSlug;
  let suffix = 2;
  while (pages.some((p) => p.slug === slug && p.locale === locale)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const now = new Date().toISOString();
  const nextTranslationKey = translationKey || slug;
  const content = syncContentRootProps(JSON.stringify(normalized), {
    slug,
    title: title || slug,
    summary,
    translationKey: nextTranslationKey,
    categoryId,
    tags: tags.join(", "),
    section,
    order: Number.isFinite(order) ? String(order) : "",
    featured: featured ? "true" : "false",
    published: published ? "true" : "false",
  });

  const nextPage: CmsPage = {
    slug,
    title: title || slug,
    summary,
    content,
    published,
    featured,
    locale,
    tags,
    section: section || null,
    order: Number.isFinite(order) ? order : null,
    categoryId,
    translationKey: nextTranslationKey,
    createdAt: now,
    updatedAt: now,
  };

  pages.push(nextPage);
  await saveCmsPages(pages);

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "cmsPage",
    entityId: `${locale}:${slug}`,
    before: null,
    after: buildPageAuditSnapshot(nextPage, categories),
  });

  revalidatePath(`/${locale}/admin/pages`);
  const category = categories.find((entry) => entry.id === categoryId);
  if (category) {
    const categoryPath = getCategoryPath(categories, category.id).join("/");
    revalidatePath(`/${locale}/${categoryPath}`);
    revalidatePath(`/${locale}/${categoryPath}/${slug}`);
  }

  return slug;
}

export async function deleteCmsPage(slug: string, locale: Locale = defaultLocale) {
  const session = await ensure_admin_pages();
  const pages = await loadCmsPages();
  const target = pages.find((p) => p.slug === slug && p.locale === locale) ?? null;
  const next = pages.filter((p) => !(p.slug === slug && p.locale === locale));
  await saveCmsPages(next);
  const categories = await loadCmsCategories();
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "cmsPage",
    entityId: `${locale}:${slug}`,
    before: buildPageAuditSnapshot(target, categories),
    after: null,
  });
  revalidatePath(`/${locale}/admin/pages`);
  if (target?.categoryId) {
    const category = categories.find((entry) => entry.id === target.categoryId);
    if (category) {
      const categoryPath = getCategoryPath(categories, category.id).join("/");
      revalidatePath(`/${locale}/${categoryPath}`);
      revalidatePath(`/${locale}/${categoryPath}/${slug}`);
    }
  }
}

export async function duplicateCmsPageTranslation(
  sourceSlug: string,
  sourceLocale: Locale,
  targetLocale: Locale,
) {
  const session = await ensure_admin_pages();
  if (sourceLocale === targetLocale) return;

  const pages = await loadCmsPages();
  const source = pages.find((p) => p.slug === sourceSlug && p.locale === sourceLocale) ?? null;
  if (!source) {
    throw new Error("Source page not found");
  }

  const targetExists = pages.some((p) => p.slug === source.slug && p.locale === targetLocale);
  if (targetExists) {
    return;
  }

  const now = new Date().toISOString();
  const nextPage: CmsPage = {
    ...source,
    locale: targetLocale,
    published: false,
    createdAt: now,
    updatedAt: now,
  };

  pages.push(nextPage);
  await saveCmsPages(pages);

  const categories = await loadCmsCategories();
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "cmsPage",
    entityId: `${targetLocale}:${nextPage.slug}`,
    before: null,
    after: buildPageAuditSnapshot(nextPage, categories),
  });

  revalidatePath(`/${targetLocale}/admin/pages`);
  revalidatePath(`/${sourceLocale}/admin/pages`);
  if (nextPage.categoryId) {
    const category = categories.find((entry) => entry.id === nextPage.categoryId);
    if (category) {
      const categoryPath = getCategoryPath(categories, category.id).join("/");
      revalidatePath(`/${targetLocale}/${categoryPath}`);
      revalidatePath(`/${targetLocale}/${categoryPath}/${nextPage.slug}`);
    }
  }
}
