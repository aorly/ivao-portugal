import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { AirportTimetable } from "@/components/public/airport-timetable";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  return {
    title: t("timetableTitle"),
    description: t("timetableDescription"),
    alternates: { canonical: absoluteUrl(`/${locale}/airports/timetable`) },
  };
}

export default async function AirportTimetablePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });

  const fetchAirports = unstable_cache(
    async () =>
      prisma.airport.findMany({
        select: { icao: true, name: true },
        orderBy: { icao: "asc" },
      }),
    ["public-airport-timetable"],
    { revalidate: 300 },
  );
  const airports = await fetchAirports();

  const options = airports.map((airport) => ({ icao: airport.icao, name: airport.name }));

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
      <SectionHeader
        eyebrow={t("title")}
        title={t("timetableTitle")}
        description={t("timetableDescription")}
      />

      {options.length === 0 ? (
        <Card>
          <p className="text-sm text-[color:var(--text-muted)]">{t("timetableEmptyAirports")}</p>
        </Card>
      ) : (
        <AirportTimetable
          airports={options}
          labels={{
            choose: t("timetableChoose"),
            button: t("timetableButton"),
            inbound: t("timetableInbound"),
            outbound: t("timetableOutbound"),
            empty: t("timetableEmpty"),
            loading: t("timetableLoading"),
            error: t("timetableError"),
            updated: t("timetableUpdated"),
          }}
        />
      )}
      </div>
    </main>
  );
}