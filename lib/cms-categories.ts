import fs from "node:fs/promises";
import path from "node:path";

export type CmsCategory = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

const DATA_PATH = path.join(process.cwd(), "data", "cms-categories.json");

const RESERVED_SLUGS = new Set([
  "admin",
  "airports",
  "airspace",
  "events",
  "fir",
  "firs",
  "home",
  "pages",
  "profile",
  "significant-points",
  "staff",
  "training",
]);

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cat-${Math.random().toString(36).slice(2, 10)}`;
};

async function ensureFile() {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

const normalizeSlug = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "-");

export async function loadCmsCategories(): Promise<CmsCategory[]> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as CmsCategory[];
    return parsed
      .map((category) => ({
        ...category,
        id: category.id || makeId(),
        slug: normalizeSlug(category.slug || category.name || ""),
        name: category.name || "",
        description: category.description || "",
        parentId: category.parentId ?? null,
      }))
      .filter((category) => category.slug && category.name);
  } catch (err) {
    console.error("Failed to parse cms-categories.json", err);
    return [];
  }
}

export async function saveCmsCategories(categories: CmsCategory[]) {
  await ensureFile();
  await fs.writeFile(DATA_PATH, JSON.stringify(categories, null, 2), "utf8");
}

export async function findCategoryBySlug(slug: string): Promise<CmsCategory | null> {
  const categories = await loadCmsCategories();
  return categories.find((category) => category.slug === normalizeSlug(slug)) ?? null;
}

export async function upsertCmsCategory(input: {
  id?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
}) {
  const categories = await loadCmsCategories();
  const now = new Date().toISOString();
  const slug = normalizeSlug(input.slug);
  if (!slug || !input.name.trim()) {
    throw new Error("Name and slug are required");
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error("Slug is reserved");
  }
  const parentId = input.parentId ? input.parentId.trim() : null;
  if (parentId && parentId === input.id) {
    throw new Error("Category cannot be its own parent");
  }

  const existingIndex = categories.findIndex((category) => category.id === input.id);
  const conflict = categories.find((category) => category.slug === slug && category.id !== input.id);
  if (conflict) {
    throw new Error("Slug already exists");
  }
  if (parentId) {
    const parent = categories.find((category) => category.id === parentId);
    if (!parent) {
      throw new Error("Parent category not found");
    }
    const isDescendant = (candidateId: string, targetId: string): boolean => {
      if (candidateId === targetId) return true;
      const candidate = categories.find((category) => category.id === candidateId);
      if (!candidate?.parentId) return false;
      return isDescendant(candidate.parentId, targetId);
    };
    if (input.id && isDescendant(parentId, input.id)) {
      throw new Error("Parent creates a cycle");
    }
  }

  const next: CmsCategory = {
    id: existingIndex >= 0 ? categories[existingIndex].id : makeId(),
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || "",
    parentId,
    createdAt: existingIndex >= 0 ? categories[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    categories[existingIndex] = next;
  } else {
    categories.push(next);
  }

  await saveCmsCategories(categories);
  return next;
}

export function getCategoryPath(categories: CmsCategory[], categoryId: string): string[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const path: string[] = [];
  let current = byId.get(categoryId) ?? null;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    path.unshift(current.slug);
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }
  return path;
}

export function findCategoryByPath(categories: CmsCategory[], segments: string[]): CmsCategory | null {
  const normalized = segments.map((segment) => normalizeSlug(segment));
  return (
    categories.find((category) => {
      const path = getCategoryPath(categories, category.id);
      if (path.length !== normalized.length) return false;
      return path.every((segment, index) => segment === normalized[index]);
    }) ?? null
  );
}

export function buildCategoryOptions(categories: CmsCategory[]) {
  const byParent = new Map<string | null, CmsCategory[]>();
  categories.forEach((category) => {
    const key = category.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(category);
    byParent.set(key, list);
  });

  const walk = (parentId: string | null, depth: number): Array<{ id: string; label: string }> => {
    const list = (byParent.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    return list.flatMap((category) => [
      { id: category.id, label: `${"  ".repeat(depth)}${category.name} (${getCategoryPath(categories, category.id).join("/")})` },
      ...walk(category.id, depth + 1),
    ]);
  };

  return walk(null, 0);
}

export async function deleteCmsCategory(id: string) {
  const categories = await loadCmsCategories();
  const next = categories.filter((category) => category.id !== id);
  await saveCmsCategories(next);
}
