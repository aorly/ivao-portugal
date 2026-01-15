import fs from "node:fs/promises";
import path from "node:path";
import { type Locale, defaultLocale } from "@/i18n";

export type CmsPage = {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  published: boolean;
  featured?: boolean;
  locale: Locale;
  tags?: string[];
  section?: string | null;
  order?: number | null;
  categoryId?: string | null;
  translationKey?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type PuckPageData = {
  root?: Record<string, unknown>;
  content?: Array<Record<string, unknown>>;
  zones?: Record<string, Array<Record<string, unknown>>>;
};

const DATA_PATH = path.join(process.cwd(), "data", "cms-pages.json");

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

export async function loadCmsPages(): Promise<CmsPage[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as CmsPage[];
    return parsed.map((p) => ({
      ...p,
      locale: (p.locale as Locale) ?? defaultLocale,
      published: !!p.published,
      featured: !!p.featured,
      tags: Array.isArray(p.tags)
        ? Array.from(
            new Set(
              p.tags
                .filter((tag): tag is string => typeof tag === "string")
                .map((tag) => tag.trim())
                .filter(Boolean),
            ),
          )
        : [],
      section: typeof p.section === "string" && p.section.trim() ? p.section.trim() : null,
      order: typeof p.order === "number" && Number.isFinite(p.order) ? p.order : null,
      categoryId: typeof p.categoryId === "string" && p.categoryId.trim() ? p.categoryId : null,
      translationKey: typeof p.translationKey === "string" && p.translationKey.trim() ? p.translationKey.trim() : null,
    }));
  } catch (err) {
    console.error("Failed to parse cms-pages.json", err);
    return [];
  }
}

export async function saveCmsPages(pages: CmsPage[]) {
  await ensureFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(pages, null, 2), "utf8");
}

export async function findPublishedPage(locale: Locale, slug: string): Promise<CmsPage | null> {
  const pages = await loadCmsPages();
  return (
    pages.find(
      (p) =>
        p.slug === slug &&
        p.published &&
        (p.locale === locale || (p.locale ?? defaultLocale) === locale),
    ) ?? null
  );
}

export async function findPublishedPageByCategory(
  locale: Locale,
  categoryId: string,
  slug: string,
): Promise<CmsPage | null> {
  const pages = await loadCmsPages();
  return (
    pages.find(
      (p) =>
        p.slug === slug &&
        p.categoryId === categoryId &&
        p.published &&
        (p.locale === locale || (p.locale ?? defaultLocale) === locale),
    ) ?? null
  );
}

export function parsePuckContent(content: string): PuckPageData | null {
  try {
    const parsed = JSON.parse(content) as PuckPageData;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.content)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function renderContentToHtml(content: string) {
  // If the content looks like HTML (from rich text editor), trust it for staff-only use.
  if (content.trim().startsWith("<")) {
    return content;
  }
  // Light-weight renderer: convert double newlines to paragraphs and single newlines to breaks.
  const paragraphs = content.split(/\n{2,}/).map((block) => block.trim());
  const html = paragraphs
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
  return html || "<p></p>";
}
