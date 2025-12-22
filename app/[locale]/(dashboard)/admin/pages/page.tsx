import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadCmsPages } from "@/lib/cms-pages";
import { type Locale } from "@/i18n";
import { PuckEditor } from "@/components/admin/puck-editor";
import { deleteCmsPage, upsertCmsPage } from "./actions";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ edit?: string }>;
};

export default async function AdminPagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
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
  const sp = (await searchParams) ?? {};
  const pages = (await loadCmsPages())
    .filter((p) => p.locale === locale)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const editing = sp.edit ? pages.find((p) => p.slug === sp.edit) ?? null : null;

  return (
    <main className="space-y-4">
      <Card className="space-y-3 p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Pages ({locale})</p>
            <p className="text-sm text-[color:var(--text-muted)]">Use the editor below to create or update a page.</p>
          </div>
          {editing ? (
            <Link href={`/${locale}/admin/pages`} className="text-xs text-[color:var(--primary)] underline">
              Clear edit
            </Link>
          ) : null}
        </div>

        <form
          action={async (formData) => {
            "use server";
            await upsertCmsPage(formData, locale);
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="text-[color:var(--text-muted)]">Slug</span>
              <input
                name="slug"
                placeholder="example-page"
                required
                defaultValue={editing?.slug ?? ""}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-[color:var(--text-muted)]">Title</span>
              <input
                name="title"
                placeholder="Page title"
                required
                defaultValue={editing?.title ?? ""}
                className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Summary</span>
            <input
              name="summary"
              placeholder="Optional short summary"
              defaultValue={editing?.summary ?? ""}
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="space-y-1 text-sm">
            <PuckEditor
              name="content"
              label="Content"
              helperText="Drag blocks into the canvas. Content is stored as JSON."
              defaultValue={editing?.content ?? ""}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input type="checkbox" name="published" className="h-4 w-4" defaultChecked={editing?.published ?? false} />
            <span>Published</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" size="md">
              Save page
            </Button>
            <p className="text-xs text-[color:var(--text-muted)]">Paths: /{locale}/pages/[slug]</p>
          </div>
        </form>
      </Card>
    </main>
  );
}
