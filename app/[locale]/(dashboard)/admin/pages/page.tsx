import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadCmsPages } from "@/lib/cms-pages";
import { type Locale, locales } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import Link from "next/link";
import { deleteCmsPage, duplicateCmsPageTranslation, createCmsPageFromJson } from "./actions";
import { redirect } from "next/navigation";
import { getCategoryPath, loadCmsCategories } from "@/lib/cms-categories";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminPagesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const linkBase =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
  const linkPrimary = `${linkBase} px-3 py-2 text-sm bg-[color:var(--primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[color:var(--primary-strong)]`;
  const linkSecondary = `${linkBase} px-3 py-2 text-sm border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]`;
  const allowed = await requireStaffPermission("admin:pages");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const allPages = await loadCmsPages();
  const pages = allPages.filter((p) => p.locale === locale).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const categories = await loadCmsCategories();
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const pagesByTranslation = new Map<string, typeof allPages>();
  allPages.forEach((page) => {
    const key = page.translationKey ?? page.slug;
    const existing = pagesByTranslation.get(key) ?? [];
    existing.push(page);
    pagesByTranslation.set(key, existing);
  });

  return (
    <main className="space-y-4">
      <Card className="space-y-3 p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Pages ({locale})</p>
            <p className="text-sm text-[color:var(--text-muted)]">Manage public CMS pages and their status.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <details className="relative">
              <summary className={linkSecondary}>Create from JSON</summary>
              <div className="absolute right-0 z-10 mt-2 w-[min(520px,80vw)] rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-[var(--shadow-soft)]">
                <form
                  className="space-y-3"
                  action={async (formData) => {
                    "use server";
                    const slug = await createCmsPageFromJson(formData, locale);
                    redirect(`/${locale}/admin/pages/${slug}`);
                  }}
                >
                  <textarea
                    name="puckJson"
                    rows={8}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                    placeholder='Paste Puck JSON here (root + content).'
                    required
                  />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Creates a new page in {locale.toUpperCase()}.
                    </p>
                    <Button size="sm" variant="primary" type="submit">
                      Create page
                    </Button>
                  </div>
                </form>
              </div>
            </details>
            <Link href={`/${locale}/admin/pages/new`} className={linkPrimary}>
              New page
            </Link>
          </div>
        </div>

        {pages.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No pages yet.</p>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => {
              const translationKey = page.translationKey ?? page.slug;
              const translations = pagesByTranslation.get(translationKey) ?? [];
              const missingLocales = locales.filter(
                (entry) => !translations.some((item) => item.locale === entry),
              );
              return (
                <div
                  key={page.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{page.title}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {(() => {
                        const category = page.categoryId ? categoryById.get(page.categoryId) : null;
                        return category
                          ? `/${locale}/${getCategoryPath(categories, category.id).join("/")}/${page.slug}`
                          : `/${locale}/[category]/${page.slug}`;
                      })()}
                    </p>
                    {page.categoryId ? (
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {categoryById.get(page.categoryId)?.name ?? "Unknown category"}
                      </p>
                    ) : (
                      <p className="text-xs text-[color:var(--danger)]">Missing category</p>
                    )}
                    {page.section || typeof page.order === "number" ? (
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {page.section ? `Section: ${page.section}` : "Section: General"}
                        {typeof page.order === "number" ? ` - Order: ${page.order}` : ""}
                      </p>
                    ) : null}
                    {page.tags && page.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {page.tags.map((tag) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
                      <span>Translations</span>
                      {locales.map((entry) => (
                        <span
                          key={entry}
                          className={[
                            "rounded-full px-2 py-0.5 uppercase",
                            translations.some((item) => item.locale === entry)
                              ? "bg-[color:var(--surface-3)] text-[color:var(--text-primary)]"
                              : "bg-[color:var(--surface)] text-[color:var(--text-muted)]",
                          ].join(" ")}
                        >
                          {entry}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                      <span>{page.published ? "Published" : "Draft"}</span>
                      {page.featured ? <span>Featured</span> : null}
                      <span>-</span>
                      <span>Updated {new Date(page.updatedAt).toLocaleString(locale)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/${locale}/admin/pages/${page.slug}`} className={linkSecondary}>
                      Edit
                    </Link>
                    {missingLocales.map((targetLocale) => (
                      <form
                        key={targetLocale}
                        action={async () => {
                          "use server";
                          await duplicateCmsPageTranslation(page.slug, locale, targetLocale);
                        }}
                      >
                        <Button size="sm" variant="secondary" type="submit">
                          Create {targetLocale.toUpperCase()}
                        </Button>
                      </form>
                    ))}
                    <form
                      action={async () => {
                        "use server";
                        await deleteCmsPage(page.slug, locale);
                      }}
                    >
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}
