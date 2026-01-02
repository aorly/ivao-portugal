import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { buildCategoryOptions, getCategoryPath, loadCmsCategories } from "@/lib/cms-categories";
import { deleteCategory, upsertCategory } from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminPageCategoriesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const linkBase =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]";
  const linkGhost = `${linkBase} px-3 py-2 text-sm text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]`;
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
  const options = buildCategoryOptions(categories);

  return (
    <main className="space-y-4">
      <Card className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Page categories</p>
            <p className="text-sm text-[color:var(--text-muted)]">Manage category routes for CMS pages.</p>
          </div>
          <Link href={`/${locale}/admin/pages`} className={linkGhost}>
            Back to pages
          </Link>
        </div>

        <form
          action={async (formData) => {
            "use server";
            await upsertCategory(formData);
          }}
          className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_auto]"
        >
          <input type="hidden" name="locale" value={locale} />
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Name</span>
            <input
              name="name"
              placeholder="Documentation"
              required
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Slug</span>
            <input
              name="slug"
              placeholder="documentation"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[color:var(--text-muted)]">Parent category</span>
            <select
              name="parentId"
              defaultValue=""
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="">Top level</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" size="sm">
              Add
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4 md:p-6">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Existing categories</p>
        {categories.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No categories yet.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{category.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      /{locale}/{getCategoryPath(categories, category.id).join("/")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                        Edit
                      </summary>
                      <form
                        action={async (formData) => {
                          "use server";
                          await upsertCategory(formData);
                        }}
                        className="mt-3 grid gap-3 md:grid-cols-3"
                      >
                        <input type="hidden" name="id" value={category.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <label className="space-y-1 text-sm">
                          <span className="text-[color:var(--text-muted)]">Name</span>
                          <input
                            name="name"
                            defaultValue={category.name}
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-[color:var(--text-muted)]">Slug</span>
                          <input
                            name="slug"
                            defaultValue={category.slug}
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-[color:var(--text-muted)]">Parent</span>
                          <select
                            name="parentId"
                            defaultValue={category.parentId ?? ""}
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          >
                            <option value="">Top level</option>
                            {options
                              .filter((option) => option.id !== category.id)
                              .map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm md:col-span-3">
                          <span className="text-[color:var(--text-muted)]">Description</span>
                          <input
                            name="description"
                            defaultValue={category.description ?? ""}
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          />
                        </label>
                        <div className="md:col-span-3">
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </div>
                      </form>
                    </details>
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                        + Subcategory
                      </summary>
                      <form
                        action={async (formData) => {
                          "use server";
                          await upsertCategory(formData);
                        }}
                        className="mt-3 grid gap-3 md:grid-cols-[1.5fr_1fr_auto]"
                      >
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="parentId" value={category.id} />
                        <label className="space-y-1 text-sm">
                          <span className="text-[color:var(--text-muted)]">Name</span>
                          <input
                            name="name"
                            placeholder="Subcategory"
                            required
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-[color:var(--text-muted)]">Slug</span>
                          <input
                            name="slug"
                            placeholder="slug"
                            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                          />
                        </label>
                        <div className="flex items-end">
                          <Button type="submit" size="sm">
                            Add
                          </Button>
                        </div>
                      </form>
                    </details>
                    <form
                      action={async (formData) => {
                        "use server";
                        await deleteCategory(formData);
                      }}
                    >
                      <input type="hidden" name="id" value={category.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
