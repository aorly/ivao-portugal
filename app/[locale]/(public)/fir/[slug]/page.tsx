import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { NavAidMap } from "@/components/map/nav-aid-map";
import { FirExplorer } from "@/components/public/fir-explorer";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

const getFirDetail = unstable_cache(
  (slugValue: string) =>
    prisma.fir.findUnique({
      where: { slug: slugValue },
      include: {
        airports: { select: { icao: true, name: true }, orderBy: { icao: "asc" } },
        frequencies: {
          orderBy: [{ station: "asc" }, { frequency: "asc" }],
          include: { boundaries: { include: { points: { orderBy: { order: "asc" } } } } },
        },
        fixes: { select: { id: true, name: true, latitude: true, longitude: true } },
        vors: { select: { id: true, ident: true, frequency: true, latitude: true, longitude: true } },
        ndbs: { select: { id: true, ident: true, frequency: true, latitude: true, longitude: true } },
      },
    }),
  ["public-fir"],
  { revalidate: 600 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "fir" });
  const slugUpper = slug.toUpperCase();
  const fir = await getFirDetail(slugUpper);

  if (!fir) {
    return {
      title: t("title", { slug: slugUpper }),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: fir.name,
    description: fir.description ?? t("body"),
    alternates: { canonical: absoluteUrl(`/${locale}/fir/${fir.slug}`) },
  };
}

export default async function FirDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "fir" });
  const session = await auth();
  const isStaff = session?.user && session.user.role !== "USER";
  const slugUpper = slug.toUpperCase();

  if (slug !== slugUpper) {
    redirect(`/${locale}/fir/${slugUpper}`);
  }

  const fir = await getFirDetail(slugUpper);

  if (!fir) {
    return (
      <main className="flex flex-col gap-6">
        <div className="mx-auto w-full max-w-6xl">
        <SectionHeader eyebrow="FIR" title={slugUpper} description="Not found" />
        <Card className="p-4">
          <p className="text-sm text-[color:var(--text-muted)]">This FIR does not exist.</p>
        </Card>
        </div>
      </main>
    );
  }

  const updatedAt = new Date(fir.updatedAt);
  const updatedLabel = Number.isNaN(updatedAt.getTime()) ? null : updatedAt.toLocaleString(locale);

  const navAidItems = [
    ...fir.fixes.map((f) => ({ id: f.id, type: "FIX" as const, code: f.name, lat: f.latitude, lon: f.longitude })),
    ...fir.vors.map((v) => ({ id: v.id, type: "VOR" as const, code: v.ident, lat: v.latitude, lon: v.longitude, extra: v.frequency })),
    ...fir.ndbs.map((n) => ({ id: n.id, type: "NDB" as const, code: n.ident, lat: n.latitude, lon: n.longitude, extra: n.frequency })),
  ];
  const boundaryItems = fir.frequencies.flatMap((f) =>
    f.boundaries.map((b) => ({
      id: b.id,
      label: `${f.station} ${f.frequency}`,
      freqKey: `${f.station}__${f.frequency}`,
      points: b.points.map((p) => ({ lat: Number(p.lat), lon: Number(p.lon) })),
    })),
  );

  // Deduplicate frequencies with the same station + frequency, merging boundary ids
  const frequencyMap = new Map<
    string,
    { id: string; station: string; frequency: string; boundaryIds: string[] }
  >();
  fir.frequencies.forEach((f) => {
    const key = `${f.station}__${f.frequency}`;
    const existing = frequencyMap.get(key);
    const boundaryIds = f.boundaries.map((b) => b.id);
    if (existing) {
      existing.boundaryIds = Array.from(new Set([...existing.boundaryIds, ...boundaryIds]));
    } else {
      frequencyMap.set(key, { id: key, station: f.station, frequency: f.frequency, boundaryIds });
    }
  });
  const frequencyList = Array.from(frequencyMap.values());

  const boundaries = boundaryItems.map((b) => ({
    id: b.id,
    label: b.label,
    freqId: b.freqKey,
    points: b.points,
  }));

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        eyebrow={t("title", { slug: fir.slug })}
        title={fir.name}
        description={fir.description ?? t("body")}
      />
      {isStaff || updatedLabel ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
          {isStaff ? <Badge>Published</Badge> : null}
          {updatedLabel ? <span>Last updated {updatedLabel}</span> : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airports</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{fir.airports.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Frequencies</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{fir.frequencies.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Nav aids</p>
          <p className="text-sm text-[color:var(--text-primary)]">
            FIX {fir.fixes.length} · VOR {fir.vors.length} · NDB {fir.ndbs.length}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Slug</p>
          <p className="text-2xl font-semibold text-[color:var(--text-primary)]">{fir.slug}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Airports</p>
            <span className="text-[11px] text-[color:var(--text-muted)]">{fir.airports.length} total</span>
          </div>
          {fir.airports.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No airports linked to this FIR yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {fir.airports.map((airport) => (
                <Link
                  key={airport.icao}
                  href={`/${locale}/airports/${airport.icao.toLowerCase()}`}
                  className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
                >
                  {airport.icao} · {airport.name}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Frequencies & Boundaries</p>
            <span className="text-[11px] text-[color:var(--text-muted)]">{fir.frequencies.length} total</span>
          </div>
          {fir.frequencies.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No ATC frequencies published yet.</p>
          ) : (
            <FirExplorer navAids={navAidItems} boundaries={boundaries} frequencies={frequencyList} />
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Navigation Aids</p>
          <span className="text-[11px] text-[color:var(--text-muted)]">Map</span>
        </div>
        {navAidItems.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No nav aids imported for this FIR yet.</p>
        ) : (
          <NavAidMap items={navAidItems} />
        )}
      </Card>
    </main>
  );
}
