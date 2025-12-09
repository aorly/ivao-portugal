import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { refreshWeather } from "@/app/[locale]/(public)/airports/[icao]/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale; icao: string }>;
};

export default async function AirportDetailPage({ params }: Props) {
  const { locale, icao: rawIcao } = await params;
  const t = await getTranslations({ locale, namespace: "airports" });
  const icao = rawIcao.toUpperCase();

  const airport = await prisma.airport.findUnique({
    where: { icao },
    include: {
      fir: { select: { slug: true, id: true } },
      weatherLogs: {
        orderBy: { timestamp: "desc" },
        take: 5,
      },
    },
  });

  if (!airport) {
    return (
      <main className="flex flex-col gap-6">
        <SectionHeader eyebrow={t("title")} title={icao} description="Not found" />
        <Card>
          <p className="text-sm text-[color:var(--text-muted)]">Airport not found.</p>
        </Card>
      </main>
    );
  }

  const latest = airport.weatherLogs[0];

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        eyebrow={airport.fir?.slug ?? "FIR"}
        title={t("detailTitle", { icao })}
        description={airport.name}
      />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[color:var(--text-muted)]">{t("metar")}</p>
            <p className="text-base font-semibold text-[color:var(--text-primary)]">
              {latest?.rawMetar ?? t("detailBody")}
            </p>
            <p className="text-sm text-[color:var(--text-muted)] mt-2">{t("taf")}</p>
            <p className="text-sm text-[color:var(--text-primary)]">{latest?.rawTaf ?? "-"}</p>
          </div>
          <form action={async () => refreshWeather(icao, locale)}>
            <Button size="sm">{t("refreshWeather")}</Button>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("weatherHistory")}</p>
          {airport.weatherLogs.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("noHistory")}</p>
          ) : (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {airport.weatherLogs.map((log) => (
                <li key={log.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                  <p className="text-xs">{new Date(log.timestamp).toUTCString()}</p>
                  <p className="text-sm text-[color:var(--text-primary)]">{log.rawMetar}</p>
                  {log.rawTaf ? <p className="text-xs">{log.rawTaf}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("traffic")}</p>
          <p className="text-sm text-[color:var(--text-muted)]">{t("detailBody")}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("stands")}</p>
        <p className="text-sm text-[color:var(--text-muted)]">{t("detailBody")}</p>
      </Card>

      {airport.fir ? (
        <Link href={`/${locale}/fir/${airport.fir.slug}`}>
          <Button variant="secondary" size="sm">
            {airport.fir.slug}
          </Button>
        </Link>
      ) : null}
    </main>
  );
}
