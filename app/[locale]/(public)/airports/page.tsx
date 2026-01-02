import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { SectionHeader } from "@/components/ui/section-header";
import { AirportsGrid } from "@/components/public/airports-grid";
import { Card } from "@/components/ui/card";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/airports`) },
  };
}

export default async function AirportsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });

  const fetchAirports = unstable_cache(
    async () =>
      prisma.airport.findMany({
        include: {
          fir: { select: { slug: true } },
          _count: { select: { stands: true, sids: true, stars: true } },
        },
        orderBy: [{ fir: { slug: "asc" } }, { icao: "asc" }],
      }),
    ["public-airports"],
    { revalidate: 300 },
  );
  const airports = await fetchAirports();

  const mapped = airports.map((a) => ({
    id: a.id,
    icao: a.icao,
    iata: a.iata,
    name: a.name,
    fir: a.fir?.slug ?? "—",
    stands: a._count.stands,
    sids: a._count.sids,
    stars: a._count.stars,
    updatedAt: a.updatedAt,
  }));

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
      <SectionHeader eyebrow={t("title")} title={t("title")} description={t("description")} />

      <Card className="p-4 space-y-2 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">What you can edit</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Manage airport details and add runways, holding points, SIDs, STARs, stands, charts, sceneries, and ATC frequencies.
        </p>
      </Card>

      <AirportsGrid airports={mapped} locale={locale} />
      </div>
    </main>
  );
}