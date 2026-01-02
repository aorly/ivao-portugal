import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { ImportNavAids } from "@/components/admin/import-nav-aids";
import { NavAidList } from "@/components/admin/nav-aid-list";
import { NavAidMap } from "@/components/map/nav-aid-map";
import { ImportFrequencyBoundaries } from "@/components/admin/import-frequency-boundaries";
import { ImportAiracAirports } from "@/components/admin/import-airac-airports";
import { getTranslations } from "next-intl/server";
import { requireStaffPermission } from "@/lib/staff";
import { unstable_cache } from "next/cache";

type Props = { params: Promise<{ locale: Locale }> };

const getAiracData = unstable_cache(
  async () => {
    const firs = await prisma.fir.findMany({ orderBy: { slug: "asc" }, select: { id: true, slug: true } });
    const fixesRaw = await prisma.fix.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, latitude: true, longitude: true, fir: { select: { slug: true } } },
    });
    const vorsRaw = await prisma.vor.findMany({
      orderBy: { ident: "asc" },
      select: { id: true, ident: true, frequency: true, latitude: true, longitude: true, fir: { select: { slug: true } } },
    });
    const ndbsRaw = await prisma.ndb.findMany({
      orderBy: { ident: "asc" },
      select: { id: true, ident: true, frequency: true, latitude: true, longitude: true, fir: { select: { slug: true } } },
    });
    return { firs, fixesRaw, vorsRaw, ndbsRaw };
  },
  ["admin-airac-data"],
  { revalidate: 300, tags: ["airac"] },
);

export default async function AiracPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:airac");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const { firs, fixesRaw, vorsRaw, ndbsRaw } = await getAiracData();
  const firOptions = firs.map((f) => ({ id: f.id, label: f.slug }));

  const sortByFir = <T extends { fir?: { slug?: string | null } | null; name?: string; ident?: string }>(items: T[]) =>
    items.slice().sort((a, b) => {
      const aFir = a.fir?.slug ?? "";
      const bFir = b.fir?.slug ?? "";
      if (aFir !== bFir) return aFir.localeCompare(bFir);
      const aId = (a as any).name ?? (a as any).ident ?? "";
      const bId = (b as any).name ?? (b as any).ident ?? "";
      return aId.localeCompare(bId);
    });

  const fixes = sortByFir(fixesRaw);
  const vors = sortByFir(vorsRaw);
  const ndbs = sortByFir(ndbsRaw);

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">AIRAC Data</h1>
        <p className="text-sm text-[color:var(--text-muted)]">Import FIX/VOR/NDB by FIR with confirmation</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ImportNavAids type="FIX" firOptions={firOptions} />
        <ImportNavAids type="VOR" firOptions={firOptions} />
        <ImportNavAids type="NDB" firOptions={firOptions} />
        <ImportFrequencyBoundaries />
        <ImportAiracAirports firOptions={firOptions} />
      </div>

      <NavAidList title="FIX" items={fixes.map((f) => ({ id: f.id, code: f.name, fir: f.fir?.slug ?? "Unknown" }))} />
      <NavAidList title="VOR" items={vors.map((v) => ({ id: v.id, code: v.ident, extra: v.frequency, fir: v.fir?.slug ?? "Unknown" }))} />
      <NavAidList title="NDB" items={ndbs.map((n) => ({ id: n.id, code: n.ident, extra: n.frequency, fir: n.fir?.slug ?? "Unknown" }))} />

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Map overview</p>
        <NavAidMap
          items={[
            ...fixes.map((f) => ({ id: f.id, type: "FIX" as const, code: f.name, lat: f.latitude, lon: f.longitude })),
            ...vors.map((v) => ({ id: v.id, type: "VOR" as const, code: v.ident, extra: v.frequency, lat: v.latitude, lon: v.longitude })),
            ...ndbs.map((n) => ({ id: n.id, type: "NDB" as const, code: n.ident, extra: n.frequency, lat: n.latitude, lon: n.longitude })),
          ]}
        />
      </Card>
    </main>
  );
}
