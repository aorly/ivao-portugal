import fs from "node:fs/promises";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { getTranslations } from "next-intl/server";
import {
  listSignificantResources,
  loadSignificantPoints,
} from "@/lib/significant-points";
import { uploadSignificantResource, saveSignificantCsv } from "./actions";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SignificantPointsAdminPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:significant-points");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const points = await loadSignificantPoints();
  const resources = await listSignificantResources();
  const csvSample = points
    .slice(0, 3)
    .map((p) => `${p.location},${p.rawCoordinates},${p.code}`)
    .join("\n");
  const currentCsv = await fs.readFile("data/significant-points.csv", "utf-8");

  return (
    <main className="space-y-6">
      <SectionHeader title="Significant points" description="Manage data sources and private resource packages." />

      <Card className="space-y-2 border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Current dataset</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Parsed points: {points.length}. The public page reads from the internal CSV only (no public download).
        </p>
      </Card>

      <Card className="space-y-3 border border-[color:var(--border)] p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Edit dataset (CSV)</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Paste CSV rows in the format <code>Location,Coordinates,Code</code>. Coordinates are in DDMM N DDDMM W/E (e.g. 3842 N 00908 W).
            Edit names, codes, or coordinates directly here to update the public list/map.
          </p>
          <pre className="rounded bg-[color:var(--surface-3)] p-2 text-xs text-[color:var(--text-muted)]">{csvSample}</pre>
        </div>
        <form action={saveSignificantCsv} className="space-y-3">
          <textarea
            name="csv"
            defaultValue={currentCsv}
            className="min-h-[220px] w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 font-mono text-xs text-[color:var(--text-primary)]"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-[color:var(--primary)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Save CSV
            </button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 border border-[color:var(--border)] p-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Upload resource package</p>
          <p className="text-sm text-[color:var(--text-muted)]">Accepts ZIP only. Stored outside /public, but the listed links are public for distribution.</p>
        </div>
        <form action={uploadSignificantResource} className="space-y-3">
          <input
            type="text"
            name="description"
            placeholder="Description (e.g. 'v1 data pack for simulators')"
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            type="file"
            name="file"
            accept=".zip,application/zip"
            className="w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded bg-[color:var(--primary)] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Upload ZIP
            </button>
          </div>
        </form>
      </Card>

      <Card className="space-y-2 border border-[color:var(--border)] p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Stored resources</p>
        {resources.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No uploads yet.</p>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {resources.map((res) => (
              <div key={res.name} className="flex items-center justify-between py-2 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-[color:var(--text-primary)]">{res.name}</p>
                  {res.description ? (
                    <p className="text-xs text-[color:var(--text-muted)]">{res.description}</p>
                  ) : null}
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {(res.size / 1024 / 1024).toFixed(2)} MB · Updated {res.updatedAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/significant-points/resources/${encodeURIComponent(res.name)}`}
                    className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--primary)] hover:border-[color:var(--primary)]"
                  >
                    Download (public)
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
