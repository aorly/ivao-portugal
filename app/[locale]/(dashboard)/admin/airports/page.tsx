import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAirport, syncAirportByIcao } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { AirportIvaoSyncCreate } from "@/components/admin/airport-ivao-sync-create";
import { AirportIvaoSyncAll } from "@/components/admin/airport-ivao-sync-all";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: { q?: string };
};

export default async function AdminAirportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = searchParams?.q ? String(searchParams.q).trim().toLowerCase() : "";
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:airports");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }
  const [airports, firs] = await Promise.all([
    prisma.airport.findMany({
      orderBy: { icao: "asc" },
      include: { fir: { select: { slug: true } }, atcFrequencies: { select: { id: true, station: true, frequency: true } } },
    }),
    prisma.fir.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true, airports: { select: { id: true, icao: true, name: true } } },
    }),
  ]);

  const filteredAirports = query
    ? airports.filter(
        (a) =>
          a.icao.toLowerCase().includes(query) ||
          a.name.toLowerCase().includes(query) ||
          (a.fir?.slug ?? "").toLowerCase().includes(query),
      )
    : airports;

  return (
    <main className="space-y-6">
      <Card className="space-y-3 p-4 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.airports")}</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Manage ICAO data, FIR link, coordinates, ATC frequencies. Edit pages cover runways, holding points, stands,
              charts/sceneries, and SIDs/STARs.
            </p>
          </div>
          <form className="ml-auto flex flex-wrap items-center gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ""}
              placeholder="Search ICAO, name, FIR"
              className="w-56 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
            <Link href={`/${locale}/admin/airports/new`}>
              <Button size="sm">New</Button>
            </Link>
          </form>
        </div>
      </Card>

      <AirportIvaoSyncCreate locale={locale} action={syncAirportByIcao} />
      <AirportIvaoSyncAll airports={airports.map((airport) => ({ id: airport.id, icao: airport.icao }))} />

      <Card className="space-y-4 p-4 bg-[color:var(--surface-1,#111827)] border border-[color:var(--border)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            Airports ({filteredAirports.length})
          </p>
        </div>
        {filteredAirports.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            {query ? "No airports match this search." : t("cards.airportForm")}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredAirports.map((airport) => (
              <div
                key={airport.id}
                className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-[color:var(--text-primary)]">
                      {airport.icao} · {airport.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {airport.fir?.slug ?? "No FIR"} · Lat {airport.latitude.toFixed(4)} Lon {airport.longitude.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/${locale}/admin/airports/${airport.id}`}>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteAirport(airport.id, locale);
                      }}
                    >
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] text-[color:var(--text-muted)]">
                  {airport.atcFrequencies.length === 0 ? (
                    <span className="rounded bg-[color:var(--surface-2)] px-2 py-1">No ATC freqs</span>
                  ) : (
                    airport.atcFrequencies.map((f) => (
                      <span key={f.id} className="rounded bg-[color:var(--surface-2)] px-2 py-1">
                        {f.station} · {f.frequency}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4 bg-[color:var(--surface-2)] border border-[color:var(--border)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">FIR overview</p>
          <p className="text-xs text-[color:var(--text-muted)]">Jump to airports grouped by FIR</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {firs.map((fir) => (
            <div key={fir.id} className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{fir.slug}</p>
                <p className="text-xs text-[color:var(--text-muted)]">{fir.name}</p>
              </div>
              <div className="space-y-1 max-h-40 overflow-auto pr-1">
                {fir.airports.length === 0 ? (
                  <p className="text-xs text-[color:var(--text-muted)]">No airports</p>
                ) : (
                  fir.airports.map((ap) => (
                    <Link
                      key={ap.id}
                      href={`/${locale}/admin/airports/${ap.id}`}
                      className="block rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-primary)] transition hover:border-[color:var(--primary)]"
                    >
                      {ap.icao} · {ap.name}
                    </Link>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
