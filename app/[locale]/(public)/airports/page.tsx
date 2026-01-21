import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { SectionHeader } from "@/components/ui/section-header";
import { AirportsGrid } from "@/components/public/airports-grid";
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
    featured: a.featured,
    fir: a.fir?.slug ?? "N/A",
    stands: a._count.stands,
    sids: a._count.sids,
    stars: a._count.stars,
    updatedAt: a.updatedAt,
  }));

  return (
    <main className="flex flex-col gap-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeader eyebrow={t("title")} title={t("title")} description={t("description")} />

        <AirportsGrid airports={mapped} locale={locale} />
      </div>
    </main>
  );
}
