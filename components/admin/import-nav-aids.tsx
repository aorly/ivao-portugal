"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { importFixes, importNdbs, importVors } from "@/app/[locale]/(dashboard)/admin/airac/actions";

type Option = { id: string; label: string };
type ImportType = "FIX" | "VOR" | "NDB";

const actionMap: Record<ImportType, (formData: FormData) => Promise<any>> = {
  FIX: importFixes,
  VOR: importVors,
  NDB: importNdbs,
};

export function ImportNavAids({ type, firOptions }: { type: ImportType; firOptions: Option[] }) {
  const [preview, setPreview] = useState<{ toAdd: any[]; toDelete: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFir, setSelectedFir] = useState("");

  const handleSubmit = (confirm: boolean) => {
    setError(null);
    setSuccess(null);
    const form = document.getElementById(`${type}-import-form`) as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    formData.set("confirm", String(confirm));
    startTransition(async () => {
      try {
        const result = await actionMap[type](formData);
        if (result?.preview) {
          setPreview(result.preview);
        }
        if (result?.applied) {
          setSuccess("Import applied");
          setPreview(null);
          form.reset();
          setSelectedFir("");
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to import");
      }
    });
  };

  const label = type === "FIX" ? "FIX" : type === "VOR" ? "VOR" : "NDB";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{label} Import</p>
      </div>
      <form id={`${type}-import-form`} className="space-y-2" encType="multipart/form-data">
        <select
          name="firId"
          value={selectedFir}
          onChange={(e) => setSelectedFir(e.target.value)}
          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          required
        >
          <option value="">Select FIR</option>
          {firOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <input name="file" type="file" required className="w-full text-sm text-[color:var(--text-primary)]" />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => handleSubmit(false)} disabled={isPending}>
            {isPending ? "Working..." : "Preview"}
          </Button>
          {preview ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => handleSubmit(true)} disabled={isPending}>
              Confirm & Import
            </Button>
          ) : null}
        </div>
      </form>
      {error ? <p className="text-xs text-[color:var(--danger)]">{error}</p> : null}
      {success ? <p className="text-xs text-[color:var(--success,#22c55e)]">{success}</p> : null}
      {preview ? (
        <div className="space-y-2 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-xs">
          <p className="font-semibold text-[color:var(--text-primary)]">Preview</p>
          <p className="text-[color:var(--text-muted)]">To add: {preview.toAdd.length} · To delete: {preview.toDelete.length}</p>
          {preview.toDelete.length > 0 ? (
            <div>
              <p className="font-semibold text-[color:var(--danger)]">Will delete</p>
              <div className="flex flex-wrap gap-1">
                {preview.toDelete.map((item) => (
                  <span key={item.id ?? item.ident ?? item.name} className="rounded bg-[color:var(--surface-3)] px-2 py-1">
                    {(item.ident ?? item.name ?? "").toString()}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {preview.toAdd.length > 0 ? (
            <div>
              <p className="font-semibold text-[color:var(--success,#22c55e)]">Will add</p>
              <div className="flex flex-wrap gap-1">
                {preview.toAdd.map((item, idx) => (
                  <span key={item.ident ?? item.name ?? idx} className="rounded bg-[color:var(--surface-3)] px-2 py-1">
                    {(item.ident ?? item.name ?? "").toString()}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
