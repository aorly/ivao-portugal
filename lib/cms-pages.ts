import fs from "node:fs/promises";
import path from "node:path";
import { type Locale, defaultLocale } from "@/i18n";

export type CmsPage = {
  slug: string;
  title: string;
  summary?: string;
  content: string;
  published: boolean;
  locale: Locale;
  createdAt: string; // ISO
  updatedAt: string; // ISO
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
