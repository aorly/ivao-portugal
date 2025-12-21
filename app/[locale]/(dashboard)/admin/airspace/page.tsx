import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { loadAirspaceSegments } from "@/lib/airspace";
import { prisma } from "@/lib/prisma";
import { AirspaceForm } from "@/components/admin/airspace-form";
import { deleteSegment, saveRawSegments, upsertSegment } from "./actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AirspaceAdminPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airspace" });
  const segments = await loadAirspaceSegments();
  const boundaries = await prisma.frequencyBoundary.findMany({
    include: { atcFrequency: true },
    orderBy: { createdAt: "desc" },
  });
  const boundaryOptions = boundaries.map((b) => ({
    id: b.id,
    label: `${b.atcFrequency.station} ${b.atcFrequency.frequency}`,
  }));
  const rawJson = JSON.stringify(segments, null, 2);

  return (
    <main className="space-y-6">
      <SectionHeader title={t("title")} description={t("description")} />

      <div className="space-y-4">
        <Card className="border border-[color:var(--border)] p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create new segment</p>
          <p className="text-sm text-[color:var(--text-muted)]">Add ENR 2.1 airspace blocks with bands.</p>
          <div className="mt-3">
            <AirspaceForm boundaryOptions={boundaryOptions} action={upsertSegment} />
          </div>
        </Card>

        <Card className="border border-[color:var(--border)] p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Raw JSON editor</p>
          <p className="text-sm text-[color:var(--text-muted)]">
            Edit the full dataset (array of segments). If unsure, paste the JSON and the eAIP link into CHATGPT to get
            help generating or updating it.
          </p>
          <form action={saveRawSegments} className="mt-3 space-y-2">
            <textarea
              name="raw"
              defaultValue={rawJson}
              className="min-h-[280px] w-full rounded border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 font-mono text-xs"
            />
            <div className="flex justify-end">
              <button type="submit" className="rounded bg-[color:var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                Save JSON
              </button>
            </div>
          </form>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {segments.map((segment) => (
            <Card key={segment.id} className="space-y-3 border border-[color:var(--border)] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{segment.slug}</p>
                  <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{segment.title}</h2>
                </div>
                <form action={deleteSegment}>
                  <input type="hidden" name="id" value={segment.id} />
                  <button className="text-xs text-[color:var(--danger)] underline" type="submit">
                    Delete
                  </button>
                </form>
              </div>
              <AirspaceForm segment={segment} boundaryOptions={boundaryOptions} action={upsertSegment} />
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
