"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { importFrequencyBoundaries } from "@/app/[locale]/(dashboard)/admin/airac/actions";

export function ImportFrequencyBoundaries() {
  const [preview, setPreview] = useState<{ toDelete: number; toAdd: number; stations: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handle = (confirm: boolean) => {
    setError(null);
    setSuccess(null);
    const form = document.getElementById("freq-boundary-form") as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    formData.set("confirm", String(confirm));
    startTransition(async () => {
      try {
        const res = await importFrequencyBoundaries(formData);
        if (res?.preview) setPreview(res.preview);
        if (res?.applied) {
          setSuccess("Boundaries imported");
          setPreview(null);
          form.reset();
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to import");
      }
    });
  };

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Frequency Boundaries (TFL)</p>
      <form id="freq-boundary-form" className="space-y-2" encType="multipart/form-data">
        <label htmlFor="freq-boundary-file" className="sr-only">Frequency boundaries file</label>
        <input id="freq-boundary-file" name="file" type="file" required aria-label="Frequency boundaries file" className="w-full text-sm text-[color:var(--text-primary)]" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => handle(false)} disabled={isPending}>
            {isPending ? "Working..." : "Preview"}
          </Button>
          {preview ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => handle(true)} disabled={isPending}>
              Confirm & Import
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
      {success ? <p className="text-xs text-[color:var(--success,#22c55e)]">{success}</p> : null}
      {preview ? (
        <div className="space-y-1 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-xs">
          <p className="font-semibold text-[color:var(--text-primary)]">Preview</p>
          <p className="text-[color:var(--text-muted)]">
            Will delete: {preview.toDelete} - Will add: {preview.toAdd}
          </p>
          <div className="flex flex-wrap gap-1">
            {preview.stations.map((s) => (
              <span key={s} className="rounded bg-[color:var(--surface-3)] px-2 py-1">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
