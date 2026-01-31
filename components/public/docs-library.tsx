"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CategoryItem = {
  id: string;
  name: string;
  description?: string | null;
  href: string;
  depth?: number;
};

type PageItem = {
  slug: string;
  title: string;
  summary?: string | null;
  href: string;
  tags?: string[];
  section?: string | null;
  order?: number | null;
  featured?: boolean;
  updatedAt: string;
};

type Props = {
  categories: CategoryItem[];
  pages: PageItem[];
  locale: string;
};

type FilterMode = "all" | "pages" | "categories";
type SortMode = "order" | "updated" | "title";

const normalize = (value: string | undefined | null) => (value ?? "").toLowerCase().trim();

const buildSearchText = (parts: Array<string | undefined | null>) => normalize(parts.filter(Boolean).join(" "));

export function DocsLibrary({ categories, pages, locale }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<FilterMode>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("order");

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }), [locale]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((page) => {
      (page.tags ?? []).forEach((item) => {
        if (typeof item !== "string") return;
        const key = item.trim();
        if (!key) return;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pages]);

  const sectionCounts = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((page) => {
      const key = page.section?.trim() || "General";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pages]);

  const terms = useMemo(
    () => query.split(/\s+/).map((term) => normalize(term)).filter(Boolean),
    [query],
  );

  const filteredCategories = useMemo(() => {
    if (mode === "pages") return [];
    if (terms.length === 0) return categories;
    const matchesTerms = (text: string) => terms.every((term) => text.includes(term));
    return categories.filter((category) =>
      matchesTerms(buildSearchText([category.name, category.description])),
    );
  }, [categories, mode, terms]);

  const filteredPages = useMemo(() => {
    if (mode === "categories") return [];
    const matchesTerms = (text: string) => terms.every((term) => text.includes(term));
    return pages.filter((page) => {
      if (tag && !(page.tags ?? []).includes(tag)) return false;
      if (section && (page.section?.trim() || "General") !== section) return false;
      if (terms.length === 0) return true;
      const tags = (page.tags ?? []).filter((tag): tag is string => typeof tag === "string");
      return matchesTerms(buildSearchText([page.title, page.summary, page.section, ...tags]));
    });
  }, [mode, pages, section, tag, terms]);

  const sortedPages = useMemo(() => {
    const copy = [...filteredPages];
    if (sortMode === "title") {
      copy.sort((a, b) => {
        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return a.title.localeCompare(b.title);
      });
      return copy;
    }
    if (sortMode === "updated") {
      copy.sort((a, b) => {
        const aFeatured = a.featured ? 1 : 0;
        const bFeatured = b.featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
      return copy;
    }
    copy.sort((a, b) => {
      const aFeatured = a.featured ? 1 : 0;
      const bFeatured = b.featured ? 1 : 0;
      if (aFeatured !== bFeatured) return bFeatured - aFeatured;
      const aOrder = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const bOrder = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title.localeCompare(b.title);
    });
    return copy;
  }, [filteredPages, sortMode]);

  const groupedPages = useMemo(() => {
    const groups = new Map<string, PageItem[]>();
    sortedPages.forEach((page) => {
      const key = page.section?.trim() || "General";
      const list = groups.get(key) ?? [];
      list.push(page);
      groups.set(key, list);
    });
    return Array.from(groups.entries());
  }, [sortedPages]);

  const hasFilters = query.trim().length > 0 || tag || section || mode !== "all";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              Search
            </p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documentation"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
              <span>{filteredPages.length + filteredCategories.length} results</span>
              {hasFilters ? (
                <button
                  type="button"
                  className="font-semibold text-[color:var(--primary)]"
                  onClick={() => {
                    setQuery("");
                    setTag(null);
                    setSection(null);
                    setMode("all");
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              View
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "pages", "categories"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    mode === value
                      ? "bg-[color:var(--primary)] text-white"
                      : "border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  }`}
                  onClick={() => setMode(value)}
                >
                  {value === "all" ? "All" : value === "pages" ? "Pages" : "Categories"}
                </button>
              ))}
            </div>
          </div>

          {sectionCounts.length > 1 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Sections
              </p>
              <div className="flex flex-wrap gap-2">
                {sectionCounts.map(([label, count]) => {
                  const active = section === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        active
                          ? "bg-[color:var(--primary)] text-white"
                          : "border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                      }`}
                      onClick={() => setSection(active ? null : label)}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {tagCounts.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tagCounts.map(([label, count]) => {
                  const active = tag === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        active
                          ? "bg-[color:var(--primary)] text-white"
                          : "border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                      }`}
                      onClick={() => setTag(active ? null : label)}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              Sort
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(["order", "updated", "title"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    sortMode === value
                      ? "bg-[color:var(--primary)] text-white"
                      : "border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  }`}
                  onClick={() => setSortMode(value)}
                >
                  {value === "order" ? "Order" : value === "updated" ? "Updated" : "Title"}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <div className="space-y-6">
          {filteredCategories.length === 0 && filteredPages.length === 0 ? (
            <Card className="p-4 text-sm text-[color:var(--text-muted)]">
              {hasFilters
                ? "No results found. Try a different search or clear filters."
                : "No pages published yet in this category."}
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredCategories.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Categories</h2>
                    <span className="text-xs text-[color:var(--text-muted)]">{filteredCategories.length}</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((subcategory) => (
                      <Link key={subcategory.id} href={subcategory.href}>
                        <Card className="h-full space-y-2 p-4 transition hover:-translate-y-[2px]">
                          <p
                            className="text-sm font-semibold text-[color:var(--text-primary)]"
                            style={subcategory.depth ? { paddingLeft: `${subcategory.depth * 12}px` } : undefined}
                          >
                            {subcategory.name}
                          </p>
                          {subcategory.description ? (
                            <p
                              className="text-sm text-[color:var(--text-muted)] line-clamp-3"
                              style={subcategory.depth ? { paddingLeft: `${subcategory.depth * 12}px` } : undefined}
                            >
                              {subcategory.description}
                            </p>
                          ) : null}
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {sortedPages.length > 0 ? (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Pages</h2>
                    <span className="text-xs text-[color:var(--text-muted)]">{sortedPages.length}</span>
                  </div>
                  <div className="space-y-6">
                    {groupedPages.map(([groupLabel, groupPages]) => (
                      <div key={groupLabel} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                            {groupLabel}
                          </h3>
                          <span className="text-xs text-[color:var(--text-muted)]">{groupPages.length}</span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {groupPages.map((page) => (
                            <Link key={page.slug} href={page.href}>
                              <Card className="h-full space-y-2 p-4 transition hover:-translate-y-[2px]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge>Published</Badge>
                                    {page.featured ? <Badge>Featured</Badge> : null}
                                  </div>
                                  <span className="text-[11px] text-[color:var(--text-muted)]">
                                    Updated {dateFormatter.format(new Date(page.updatedAt))}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{page.title}</p>
                                {page.summary ? (
                                  <p className="text-sm text-[color:var(--text-muted)] line-clamp-3">{page.summary}</p>
                                ) : null}
                                {page.tags && page.tags.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {page.tags.map((tagValue) => (
                                      <Badge key={tagValue}>{tagValue}</Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
