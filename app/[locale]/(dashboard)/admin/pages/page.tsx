import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadCmsPages } from "@/lib/cms-pages";
import { type Locale } from "@/i18n";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { deleteCmsPage, upsertCmsPage } from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ edit?: string }>;
};

export default async function AdminPagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const pages = (await loadCmsPages())
    .filter((p) => p.locale === locale)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const editing = sp.edit ? pages.find((p) => p.slug === sp.edit) ?? null : null;

  return (
    <main className="space-y-4">
      <Card className="space-y-3 p-4 md:p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Pages ({locale})</p>
            <p className="text-sm text-[color:var(--text-muted)]">
              Manage simple public pages without touching code. Content is stored in JSON per locale.
            </p>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">Fields accept Markdown-like text; new lines are preserved.</p>
        </div>

        <form
          action={async (formData) => {
            "use server";
            await upsertCmsPage(formData, locale);
          }}
          className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {editing ? `Editing: ${editing.slug}` : "Create or update"}
              </p>
              <p className="text-xs text-[color:var(--text-muted)]">
                {editing ? "Loaded from the list below. Saving will overwrite this page." : "Use the slug to create or replace a page."}
              </p>
            </div>
            {editing ? (
              <Link
                href={`/${locale}/admin/pages`}
                className="text-xs text-[color:var(--primary)] underline"
              >
                Clear edit
              </Link>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
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
            <label className="space-y-1 text-sm">
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
            <RichTextEditor
              name="content"
              label="Content"
              helperText="Use headings, lists, and links. Formatting is stored as HTML."
              defaultValue={editing?.content ?? ""}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input type="checkbox" name="published" className="h-4 w-4" defaultChecked={editing?.published ?? false} />
            <span>Published</span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="md">
              Save page
            </Button>
            <p className="text-xs text-[color:var(--text-muted)]">
              Reuse slug to update existing page. Paths: /{locale}/pages/[slug]
            </p>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4 md:p-6">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Existing pages ({pages.length})</p>
        {pages.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No pages for this locale yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pages.map((page) => (
              <div
                key={`${page.locale}-${page.slug}`}
                className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                      {page.title}{" "}
                      <span className="text-xs text-[color:var(--text-muted)]">/{locale}/pages/{page.slug}</span>
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Updated {new Date(page.updatedAt).toLocaleString()} Жњ {page.published ? "Published" : "Draft"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {page.published ? (
                      <Link
                        href={`/${locale}/pages/${page.slug}`}
                        className="text-xs text-[color:var(--primary)] underline"
                        target="_blank"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-[10px] text-[color:var(--text-muted)]">
                        Draft
                      </span>
                    )}
                    <Link
                      href={`/${locale}/admin/pages?edit=${page.slug}`}
                      className="text-xs text-[color:var(--primary)] underline"
                    >
                      Edit above
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteCmsPage(page.slug, locale);
                      }}
                    >
                      <Button type="submit" size="sm" variant="ghost">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
                <form
                  action={async (formData) => {
                    "use server";
                    await upsertCmsPage(formData, locale);
                  }}
                  className="space-y-2 text-sm"
                >
                  <input type="hidden" name="slug" defaultValue={page.slug} />
                  <label className="space-y-1">
                    <span className="text-[color:var(--text-muted)]">Title</span>
                    <input
                      name="title"
                      defaultValue={page.title}
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[color:var(--text-muted)]">Summary</span>
                    <input
                      name="summary"
                      defaultValue={page.summary ?? ""}
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[color:var(--text-muted)]">Content</span>
                    <textarea
                      name="content"
                      defaultValue={page.content}
                      rows={5}
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
                    <input type="checkbox" name="published" defaultChecked={page.published} className="h-4 w-4" />
                    <span>Published</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" variant="secondary">
                      Save changes
                    </Button>
                    <span className="text-[10px] text-[color:var(--text-muted)]">
                      Created {new Date(page.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
