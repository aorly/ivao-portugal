import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { FrequenciesAdmin } from "@/components/admin/frequencies-admin";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";

type Props = { params: { locale: Locale } };

export default async function AdminFrequenciesPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:frequencies");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const [frequencies, firs, airports] = await Promise.all([
    prisma.atcFrequency.findMany({
      orderBy: [{ firId: "asc" }, { airportId: "asc" }, { station: "asc" }],
      include: {
        fir: { select: { slug: true } },
        airport: { select: { icao: true, name: true } },
        boundaries: { select: { id: true } },
      },
    }),
    prisma.fir.findMany({ orderBy: { slug: "asc" }, select: { id: true, slug: true, name: true } }),
    prisma.airport.findMany({ orderBy: { icao: "asc" }, select: { id: true, icao: true, name: true, firId: true } }),
  ]);

  const grouped = {
    unassigned: frequencies.filter((f) => !f.firId && !f.airportId),
    byFir: firs.map((fir) => ({
      fir,
      freqs: frequencies.filter((f) => f.firId === fir.id),
    })),
    byAirport: airports.map((ap) => ({
      airport: ap,
      freqs: frequencies.filter((f) => f.airportId === ap.id),
    })),
  };

  return (
    <main className="space-y-4">
      <FrequenciesAdmin
        firGroups={grouped.byFir.map(({ fir, freqs }) => ({
          label: `${fir.slug} · ${fir.name}`,
          frequencies: freqs.map((f) => ({
            id: f.id,
            station: f.station,
            frequency: f.frequency,
            name: f.name,
            lower: f.lower,
            upper: f.upper,
            restricted: f.restricted,
            firId: f.firId ?? null,
            firSlug: f.fir?.slug ?? null,
            airportId: f.airportId ?? null,
            airportIcao: f.airport?.icao ?? null,
            hasBoundary: (f.boundaries?.length ?? 0) > 0,
          })),
        }))}
       airportGroups={grouped.byAirport.map(({ airport, freqs }) => ({
         label: `${airport.icao} · ${airport.name}`,
         frequencies: freqs.map((f) => ({
            id: f.id,
            station: f.station,
            frequency: f.frequency,
            name: f.name,
            lower: f.lower,
            upper: f.upper,
            restricted: f.restricted,
            firId: f.firId ?? null,
            firSlug: f.fir?.slug ?? null,
            airportId: f.airportId ?? null,
            airportIcao: f.airport?.icao ?? null,
            hasBoundary: (f.boundaries?.length ?? 0) > 0,
          })),
        }))}
       unassigned={grouped.unassigned.map((f) => ({
         id: f.id,
         station: f.station,
          frequency: f.frequency,
          name: f.name,
          lower: f.lower,
          upper: f.upper,
          restricted: f.restricted,
          firId: f.firId ?? null,
          firSlug: f.fir?.slug ?? null,
          airportId: f.airportId ?? null,
          airportIcao: f.airport?.icao ?? null,
          hasBoundary: (f.boundaries?.length ?? 0) > 0,
        }))}
        firOptions={firs.map((f) => ({ id: f.id, label: `${f.slug} · ${f.name}` }))}
        airportOptions={airports.map((a) => ({ id: a.id, label: `${a.icao} · ${a.name}` }))}
      />
    </main>
  );
}
