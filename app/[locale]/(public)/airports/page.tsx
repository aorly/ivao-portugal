import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AirportsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  const airports = await prisma.airport.findMany({
    include: { fir: { select: { slug: true } } },
    orderBy: [{ fir: { slug: "asc" } }, { icao: "asc" }],
  });

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("title")} title={t("title")} description={t("description")} />
      <div className="grid gap-4 md:grid-cols-2">
        {airports.map((airport) => (
          <Link key={airport.id} href={`/${locale}/airports/${airport.icao.toLowerCase()}`}>
            <Card className="space-y-2 hover:border-[color:var(--primary)]">
              <p className="text-sm text-[color:var(--text-muted)]">
                {airport.icao} · {airport.iata ?? ""}
              </p>
              <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
                {airport.name}
              </h3>
              <p className="text-xs text-[color:var(--text-muted)]">{airport.fir?.slug ?? "FIR"}</p>
            </Card>
          </Link>
        ))}
        {airports.length === 0 ? (
          <Card>
            <p className="text-sm text-[color:var(--text-muted)]">{t("placeholderDescription")}</p>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
