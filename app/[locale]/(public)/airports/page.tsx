import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { SectionHeader } from "@/components/ui/section-header";
import { AirportsGrid } from "@/components/public/airports-grid";
import { Card } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AirportsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });

  const airports = await prisma.airport.findMany({
    include: {
      fir: { select: { slug: true } },
      _count: { select: { stands: true, sids: true, stars: true } },
    },
    orderBy: [{ fir: { slug: "asc" } }, { icao: "asc" }],
  });

  const mapped = airports.map((a) => ({
    id: a.id,
    icao: a.icao,
    iata: a.iata,
    name: a.name,
    fir: a.fir?.slug ?? "—",
    stands: a._count.stands,
    sids: a._count.sids,
    stars: a._count.stars,
  }));

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("title")} title={t("title")} description={t("description")} />

      <Card className="p-4 space-y-2 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">What you can edit</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Manage airport details and add runways, holding points, SIDs, STARs, stands, charts, sceneries, and ATC frequencies.
        </p>
      </Card>

      <AirportsGrid airports={mapped} locale={locale} />
    </main>
  );
}
