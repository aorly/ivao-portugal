import type { Config } from "@measured/puck";
import { puckConfig } from "@/components/puck/config";

type CategoryOption = {
  id: string;
  label: string;
};

type PageConfigOptions = {
  formId: string;
  deleteFormId?: string;
  backHref?: string;
  showDelete?: boolean;
  showBack?: boolean;
};

export const createPagePuckConfig = (
  categories: CategoryOption[],
  options: PageConfigOptions,
): Config => ({
  ...puckConfig,
  root: {
    label: "Page details",
    fields: {
      slug: {
        type: "text",
        label: "Slug",
        placeholder: "example-page",
      },
      title: {
        type: "text",
        label: "Title",
        placeholder: "Page title",
      },
      summary: {
        type: "textarea",
        label: "Summary",
        placeholder: "Optional short summary",
      },
      translationKey: {
        type: "text",
        label: "Translation key",
        placeholder: "doc:atc-manual",
      },
      categoryId: {
        type: "select",
        label: "Category",
        options: categories.map((category) => ({
          label: category.label,
          value: category.id,
        })),
      },
      tags: {
        type: "text",
        label: "Tags",
        placeholder: "documentation, procedures",
      },
      section: {
        type: "text",
        label: "Section",
        placeholder: "Basics, Procedures, Advanced",
      },
      order: {
        type: "text",
        label: "Order",
        placeholder: "1",
      },
      featured: {
        type: "custom",
        render: ({ value, onChange }) => {
          const isFeatured = value === "true";
          const inputId = `${options.formId}-featured`;
          return (
            <div className="space-y-2">
              <input
                id={inputId}
                type="hidden"
                name="featured"
                defaultValue={isFeatured ? "true" : "false"}
                form={options.formId}
              />
              <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                <span>Priority</span>
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {isFeatured ? "Featured" : "Standard"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                  onClick={() => {
                    const input = document.getElementById(inputId) as HTMLInputElement | null;
                    if (input) input.value = "false";
                    onChange("false");
                    const form = document.getElementById(options.formId) as HTMLFormElement | null;
                    if (!form) return;
                    setTimeout(() => form.requestSubmit(), 0);
                  }}
                >
                  Standard
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[color:var(--primary-strong)]"
                  onClick={() => {
                    const input = document.getElementById(inputId) as HTMLInputElement | null;
                    if (input) input.value = "true";
                    onChange("true");
                    const form = document.getElementById(options.formId) as HTMLFormElement | null;
                    if (!form) return;
                    setTimeout(() => form.requestSubmit(), 0);
                  }}
                >
                  Feature
                </button>
              </div>
            </div>
          );
        },
      },
      published: {
        type: "custom",
        render: ({ value, onChange }) => {
          const isPublished = value === "true";
          const inputId = `${options.formId}-published`;
          return (
            <div className="space-y-2">
              <input
                id={inputId}
                type="hidden"
                name="published"
                defaultValue={isPublished ? "true" : "false"}
                form={options.formId}
              />
              <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                <span>Status</span>
                <span className="font-semibold text-[color:var(--text-primary)]">
                  {isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--surface-2)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                  onClick={() => {
                    const input = document.getElementById(inputId) as HTMLInputElement | null;
                    if (input) input.value = "false";
                    onChange("false");
                    const form = document.getElementById(options.formId) as HTMLFormElement | null;
                    if (!form) return;
                    setTimeout(() => form.requestSubmit(), 0);
                  }}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[color:var(--primary-strong)]"
                  onClick={() => {
                    const input = document.getElementById(inputId) as HTMLInputElement | null;
                    if (input) input.value = "true";
                    onChange("true");
                    const form = document.getElementById(options.formId) as HTMLFormElement | null;
                    if (!form) return;
                    setTimeout(() => form.requestSubmit(), 0);
                  }}
                >
                  Publish
                </button>
              </div>
            </div>
          );
        },
      },
      actions: {
        type: "custom",
        render: () => (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {options.showDelete && options.deleteFormId ? (
              <button
                type="button"
                className="rounded-full px-3 py-2 text-xs font-semibold text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                onClick={() => {
                  const form = document.getElementById(options.deleteFormId) as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
              >
                Delete
              </button>
            ) : null}
            {options.showBack && options.backHref ? (
              <a
                href={options.backHref}
                className="rounded-full px-3 py-2 text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
              >
                Back to list
              </a>
            ) : null}
          </div>
        ),
      },
    },
    render: ({ children }) => children,
  },
});
