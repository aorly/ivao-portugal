import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { loadSignificantPoints, listSignificantResources } from "@/lib/significant-points";
import { SignificantPointsMap } from "@/components/public/significant-points-map";
import { SignificantPointsBrowserLazy } from "@/components/public/significant-points-browser-lazy";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Significant points",
    description: "VFR significant points with coordinates, ready to search and map.",
    alternates: { canonical: absoluteUrl(`/${locale}/significant-points`) },
  };
}

export default async function SignificantPointsPage({ params }: Props) {
  await params;
  const fetchPoints = unstable_cache(loadSignificantPoints, ["public-significant-points"], { revalidate: 600 });
  const fetchResources = unstable_cache(listSignificantResources, ["public-significant-resources"], { revalidate: 600 });
  const [points, resources] = await Promise.all([fetchPoints(), fetchResources()]);
  const parsedCount = points.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)).length;
  const mappedPoints = points.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
      <SectionHeader
        eyebrow="Navigation"
        title="Significant points"
        description="VFR significant points with coordinates, ready to search and map."
        action={null}
      />

      <Card className="space-y-2 border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">How to use</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Search by name or code and open a point on a map. Downloads and raw files are kept in the admin area only.
        </p>
        <p className="text-xs text-[color:var(--text-muted)]">
          Parsed coordinates: {parsedCount} of {points.length}
        </p>
      </Card>

      <Card className="border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
        <p className="mb-3 text-sm font-semibold text-[color:var(--text-primary)]">Map overview</p>
        {mappedPoints.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            No coordinates available yet. Ask staff to upload the latest points file.
          </p>
        ) : (
          <SignificantPointsMap points={mappedPoints} />
        )}
      </Card>

      <SignificantPointsBrowserLazy points={points} />

      <Card className="space-y-3 border border-[color:var(--border)] bg-[color:var(--surface-2)]">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Downloads</p>
        {resources.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No downloads published yet.</p>
        ) : (
          <div className="divide-y divide-[color:var(--border)]">
            {resources.map((res) => (
              <div key={res.name} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="space-y-1">
                  <p className="font-semibold text-[color:var(--text-primary)]">{res.description || res.name}</p>
                  {res.description ? (
                    <p className="text-xs text-[color:var(--text-muted)]">{res.name}</p>
                  ) : null}
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {(res.size / 1024 / 1024).toFixed(2)} MB · Updated {res.updatedAt.toLocaleString()}
                  </p>
                </div>
                <a
                  href={`/api/significant-points/resources/${encodeURIComponent(res.name)}`}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs font-semibold text-[color:var(--primary)] hover:border-[color:var(--primary)]"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </main>
  );
}