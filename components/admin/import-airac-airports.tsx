"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { importAirportsFromAirac } from "@/app/[locale]/(dashboard)/admin/airac/actions";

type Option = { id: string; label: string };

export function ImportAiracAirports({ firOptions }: { firOptions: Option[] }) {
  const [preview, setPreview] = useState<{ toAdd: string[]; toUpdate: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedFir, setSelectedFir] = useState("");
  const [selectedAdd, setSelectedAdd] = useState<Set<string>>(new Set());
  const [selectedUpdate, setSelectedUpdate] = useState<Set<string>>(new Set());

  const handle = (confirm: boolean) => {
    setError(null);
    setSuccess(null);
    const form = document.getElementById("airac-airport-form") as HTMLFormElement | null;
    if (!form) return;
    const formData = new FormData(form);
    formData.set("confirm", String(confirm));
    if (confirm) {
      selectedAdd.forEach((icao) => formData.append("selectedAdd", icao));
      selectedUpdate.forEach((icao) => formData.append("selectedUpdate", icao));
    }
    startTransition(async () => {
      try {
        const res = await importAirportsFromAirac(formData);
        if (res?.preview) {
          setPreview(res.preview);
          setSelectedAdd(new Set(res.preview.toAdd));
          setSelectedUpdate(new Set(res.preview.toUpdate));
        }
        if (res?.applied) {
          setSuccess("Airports imported");
          setPreview(null);
          form.reset();
          setSelectedFir("");
          setSelectedAdd(new Set());
          setSelectedUpdate(new Set());
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to import");
      }
    });
  };

  const toggle = (icao: string, type: "add" | "update") => {
    if (type === "add") {
      setSelectedAdd((prev) => {
        const next = new Set(prev);
        next.has(icao) ? next.delete(icao) : next.add(icao);
        return next;
      });
    } else {
      setSelectedUpdate((prev) => {
        const next = new Set(prev);
        next.has(icao) ? next.delete(icao) : next.add(icao);
        return next;
      });
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Airports (APT)</p>
      <form id="airac-airport-form" className="space-y-2" encType="multipart/form-data">
        <label htmlFor="airac-fir" className="sr-only">FIR</label>
        <select
          id="airac-fir"
          name="firId"
          value={selectedFir}
          onChange={(e) => setSelectedFir(e.target.value)}
          className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
        >
          <option value="">Optional FIR</option>
          {firOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <label htmlFor="airac-airport-file" className="sr-only">AIRAC airport file</label>
        <input id="airac-airport-file" name="file" type="file" required aria-label="AIRAC airport file" className="w-full text-sm text-[color:var(--text-primary)]" />
        <p className="text-[11px] text-[color:var(--text-muted)]">Requires .apt file (e.g., LPPC.apt)</p>
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
            Will add: {preview.toAdd.length} - Will update: {preview.toUpdate.length}
          </p>
          {preview.toAdd.length ? (
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--text-primary)]">Add</p>
              <div className="flex flex-wrap gap-1">
                {preview.toAdd.map((icao) => (
                  <label key={icao} className="inline-flex items-center gap-1 rounded bg-[color:var(--surface-3)] px-2 py-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={selectedAdd.has(icao)}
                      onChange={() => toggle(icao, "add")}
                    />
                    <span>{icao}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {preview.toUpdate.length ? (
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--text-primary)]">Update</p>
              <div className="flex flex-wrap gap-1">
                {preview.toUpdate.map((icao) => (
                  <label key={icao} className="inline-flex items-center gap-1 rounded bg-[color:var(--surface-3)] px-2 py-1">
                    <input
                      type="checkbox"
                      className="h-3 w-3"
                      checked={selectedUpdate.has(icao)}
                      onChange={() => toggle(icao, "update")}
                    />
                    <span>{icao}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
