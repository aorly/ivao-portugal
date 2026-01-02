import Link from "next/link";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { PagePuckEditor } from "@/components/admin/page-puck-editor";
import { upsertCmsPage } from "../actions";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { buildCategoryOptions, loadCmsCategories } from "@/lib/cms-categories";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminPagesNewPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const formId = "cms-page-form";
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
  const categories = await loadCmsCategories();
  const categoryOptions = buildCategoryOptions(categories);
  const rootDefaults = {
    slug: "",
    title: "",
    summary: "",
    translationKey: "",
    categoryId: categoryOptions[0]?.id ?? "",
    tags: "",
    published: "false",
  };
  if (categories.length === 0) {
    return (
      <main className="space-y-4">
        <Card className="space-y-3 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create page</p>
            <Link href={`/${locale}/admin/pages`} className={linkGhost}>
              Back to list
            </Link>
          </div>
          <p className="text-sm text-[color:var(--text-muted)]">
            Create a category first to define the page route.
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
      />
      <PagePuckEditor
        name="content"
        formId={formId}
        label="Page editor"
        helperText="Page details are in the editor sidebar. Content is stored as JSON."
        defaultValue=""
        rootDefaults={rootDefaults}
        categoryOptions={categoryOptions}
        backHref={`/${locale}/admin/pages`}
        showBack
      />
    </main>
  );
}
