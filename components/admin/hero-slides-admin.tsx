"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Slide = {
  id: string;
  locale: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  order: number;
  isPublished: boolean;
  fullWidth: boolean;
  updatedAt: string;
};

type ActionState = { success?: boolean; error?: string };

type Props = {
  slides: Slide[];
  locales: string[];
  createAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  updateAction: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function HeroSlidesAdmin({ slides, locales, createAction, updateAction, deleteAction }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterLocale, setFilterLocale] = useState<string>("all");
  const [createState, createFormAction] = useActionState(async (prevState: ActionState, formData: FormData) => {
    const result = await createAction(prevState, formData);
    if (result?.success) {
      setShowCreate(false);
    }
    return result;
  }, { success: false, error: undefined });
  const [updateState, updateFormAction] = useActionState(async (prevState: ActionState, formData: FormData) => {
    const result = await updateAction(prevState, formData);
    if (result?.success) {
      setEditingId(null);
    }
    return result;
  }, { success: false, error: undefined });

  const visibleSlides = useMemo(() => {
    if (filterLocale === "all") return slides;
    return slides.filter((slide) => slide.locale === filterLocale);
  }, [slides, filterLocale]);

  const editingSlide = editingId ? slides.find((slide) => slide.id === editingId) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Hero slider</h1>
          <p className="text-xs text-[color:var(--text-muted)]">Manage homepage hero slides by locale and order.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterLocale}
            onChange={(event) => setFilterLocale(event.target.value)}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="all">All locales</option>
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {loc.toUpperCase()}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
            {showCreate ? "Close form" : "New slide"}
          </Button>
        </div>
      </div>

      {showCreate ? (
        <Card className="space-y-3 p-4">
          <HeroSlideForm
            locales={locales}
            onCancel={() => setShowCreate(false)}
            action={createFormAction}
            submitLabel="Create slide"
            state={createState}
          />
        </Card>
      ) : null}

      <Card className="space-y-3 p-4">
        {visibleSlides.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No hero slides yet.</p>
        ) : (
          <div className="space-y-3">
            {visibleSlides.map((slide) => (
              <div key={slide.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                      <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                        {slide.locale.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                        Order {slide.order}
                      </span>
                      {slide.fullWidth ? (
                        <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-[0.12em]">
                          Full width
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          slide.isPublished
                            ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
                            : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"
                        }`}
                      >
                        {slide.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{slide.title}</p>
                      {slide.subtitle ? (
                        <p className="text-xs text-[color:var(--text-muted)]">{slide.subtitle}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                      {slide.ctaLabel ? <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1">CTA</span> : null}
                      {slide.imageUrl ? (
                        <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1">Image</span>
                      ) : null}
                      <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1">
                        Updated {slide.updatedAt}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(slide.id)}>
                      Edit
                    </Button>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={slide.id} />
                      <input type="hidden" name="locale" value={slide.locale} />
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

      {editingSlide ? (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Edit slide</p>
              <p className="text-xs text-[color:var(--text-muted)]">Update copy, imagery, and ordering.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
              Close editor
            </Button>
          </div>
          <HeroSlideForm
            locales={locales}
            action={updateFormAction}
            submitLabel="Save changes"
            state={updateState}
            defaults={editingSlide}
            onCancel={() => setEditingId(null)}
          />
        </Card>
      ) : null}
    </div>
  );
}

type FormProps = {
  locales: string[];
  action: (formData: FormData) => void;
  submitLabel: string;
  state: ActionState;
  defaults?: Slide | null;
  onCancel: () => void;
};

function HeroSlideForm({ locales, action, submitLabel, state, defaults, onCancel }: FormProps) {
  const uploadInputId = useId();
  const [selectedFile, setSelectedFile] = useState<string>("");

  return (
    <form action={action} className="space-y-3">
      {defaults?.id ? <input type="hidden" name="id" value={defaults.id} /> : null}
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Locale</label>
        <select
          name="locale"
          defaultValue={defaults?.locale ?? locales[0]}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        >
          {locales.map((loc) => (
            <option key={loc} value={loc}>
              {loc.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Eyebrow</label>
        <input
          name="eyebrow"
          defaultValue={defaults?.eyebrow ?? ""}
          placeholder="Optional badge text"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Title</label>
        <input
          name="title"
          required
          defaultValue={defaults?.title ?? ""}
          placeholder="Slide headline"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Subtitle</label>
        <textarea
          name="subtitle"
          rows={3}
          defaultValue={defaults?.subtitle ?? ""}
          placeholder="Short supporting line"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Image URL</label>
        <input
          name="imageUrl"
          defaultValue={defaults?.imageUrl ?? ""}
          placeholder="https://..."
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="flex items-center justify-center w-full">
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-6 text-center">
          <div className="flex flex-col items-center justify-center text-sm text-[color:var(--text-muted)]">
            <svg className="mb-4 h-8 w-8" aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v9m-5 0H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-2M8 9l4-5 4 5m1 8h.01"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <p className="mb-2 text-sm text-[color:var(--text-primary)]">Click the button below to upload</p>
            <p className="mb-4 text-xs text-[color:var(--text-muted)]">
              Max. File Size: <span className="font-semibold text-[color:var(--text-primary)]">30MB</span>
            </p>
            <p className="mb-4 text-[11px] text-[color:var(--text-muted)]">Upload overrides the Image URL.</p>
            <input
              id={uploadInputId}
              name="imageFile"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setSelectedFile(file?.name ?? "");
              }}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(uploadInputId) as HTMLInputElement | null;
                el?.click();
              }}
              className="inline-flex items-center rounded-xl border border-transparent bg-[color:var(--primary)] px-3 py-2 text-sm font-medium text-white shadow-[0_10px_25px_rgba(13,44,153,0.25)] transition hover:bg-[color:var(--primary-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
            >
              <svg className="mr-1.5 h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <path
                  d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
              Browse file
            </button>
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              {selectedFile ? `Selected: ${selectedFile}` : "No file selected yet."}
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Image alt</label>
        <input
          name="imageAlt"
          defaultValue={defaults?.imageAlt ?? ""}
          placeholder="Accessible description"
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Primary CTA</label>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            name="ctaLabel"
            defaultValue={defaults?.ctaLabel ?? ""}
            placeholder="Label"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="ctaHref"
            defaultValue={defaults?.ctaHref ?? ""}
            placeholder="Href"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Secondary CTA</label>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            name="secondaryLabel"
            defaultValue={defaults?.secondaryLabel ?? ""}
            placeholder="Label"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="secondaryHref"
            defaultValue={defaults?.secondaryHref ?? ""}
            placeholder="Href"
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr]">
        <label className="text-sm text-[color:var(--text-muted)]">Order</label>
        <input
          type="number"
          name="order"
          defaultValue={defaults?.order ?? 0}
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
        <input type="checkbox" name="isPublished" defaultChecked={defaults?.isPublished ?? false} /> Published
      </label>
      <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
        <input type="checkbox" name="fullWidth" defaultChecked={defaults?.fullWidth ?? false} /> Full width image
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <Button size="sm" type="submit">
          {submitLabel}
        </Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {state?.error ? <p className="text-sm text-[color:var(--danger)]">{state.error}</p> : null}
    </form>
  );
}
