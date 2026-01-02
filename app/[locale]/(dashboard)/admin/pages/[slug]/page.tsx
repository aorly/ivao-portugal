import Link from "next/link";
import { Card } from "@/components/ui/card";
import { type Locale, locales } from "@/i18n";
import { PagePuckEditor } from "@/components/admin/page-puck-editor";
import { deleteCmsPage, upsertCmsPage } from "../actions";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { loadCmsPages } from "@/lib/cms-pages";
import { buildCategoryOptions, loadCmsCategories } from "@/lib/cms-categories";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export default async function AdminPagesEditPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const formId = "cms-page-form";
  const deleteFormId = "cms-page-delete";
  const linkBase =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
  const linkGhost = `${linkBase} px-3 py-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]`;
  const linkPrimary = `${linkBase} px-3 py-2 text-sm bg-[color:var(--primary)] text-white shadow-[var(--shadow-soft)] hover:bg-[color:var(--primary-strong)]`;
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

  const pages = await loadCmsPages();
  const page = pages.find((p) => p.slug === slug && p.locale === locale) ?? null;
  const translationKey = page?.translationKey ?? page?.slug ?? "";
  const translations = locales.map((targetLocale) => {
    const match = pages.find(
      (entry) => entry.locale === targetLocale && (entry.translationKey ?? entry.slug) === translationKey,
    );
    return { locale: targetLocale, slug: match?.slug ?? null };
  });
  const categories = await loadCmsCategories();
  const categoryOptions = buildCategoryOptions(categories);
  const category = page?.categoryId ? categories.find((entry) => entry.id === page.categoryId) ?? null : null;
  const rootDefaults = {
    slug: page?.slug ?? "",
    title: page?.title ?? "",
    summary: page?.summary ?? "",
    translationKey: page?.translationKey ?? "",
    categoryId: page?.categoryId ?? categoryOptions[0]?.id ?? "",
    tags: page?.tags?.join(", ") ?? "",
    published: page?.published ? "true" : "false",
  };

  if (!page) {
    return (
      <main className="space-y-4">
        <Card className="space-y-3 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Page not found</p>
            <Link href={`/${locale}/admin/pages`} className={linkGhost}>
              Back to list
            </Link>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">We could not find that page in this locale.</p>
        </Card>
      </main>
    );
  }
  if (categories.length === 0) {
    return (
      <main className="space-y-4">
        <Card className="space-y-3 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Missing categories</p>
            <Link href={`/${locale}/admin/pages`} className={linkGhost}>
              Back to list
            </Link>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">
            Create a category before editing CMS pages.
          </p>
          <Link href={`/${locale}/admin/page-categories`} className={linkPrimary}>
            Create category
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <form
        id={formId}
        action={async (formData) => {
          "use server";
          await upsertCmsPage(formData, locale);
        }}
      >
        <input type="hidden" name="originalSlug" value={page.slug} />
      </form>
      <form
        id={deleteFormId}
        action={async () => {
          "use server";
          await deleteCmsPage(page.slug, locale);
        }}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {translations.map((entry) => {
          const isActive = entry.locale === locale;
          if (entry.slug) {
            return (
              <Link
                key={entry.locale}
                href={`/${entry.locale}/admin/pages/${entry.slug}`}
                className={`rounded-full px-3 py-1 font-semibold ${
                  isActive
                    ? "bg-[color:var(--primary)] text-white"
                    : "border border-[color:var(--border)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                }`}
              >
                {entry.locale.toUpperCase()}
              </Link>
            );
          }
          return (
            <span
              key={entry.locale}
              className="rounded-full border border-dashed border-[color:var(--border)] px-3 py-1 text-[color:var(--text-muted)]"
            >
              {entry.locale.toUpperCase()} missing
            </span>
          );
        })}
      </div>
      <PagePuckEditor
        name="content"
        formId={formId}
        label="Page editor"
        helperText="Page details are in the editor sidebar. Content is stored as JSON."
        defaultValue={page.content ?? ""}
        rootDefaults={rootDefaults}
        categoryOptions={categoryOptions}
        deleteFormId={deleteFormId}
        backHref={`/${locale}/admin/pages`}
        showDelete
        showBack
      />
    </main>
  );
}
