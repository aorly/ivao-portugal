import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAirport, syncAirportByIcao } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { AirportIvaoSyncCreate } from "@/components/admin/airport-ivao-sync-create";
import { AirportIvaoSyncAll } from "@/components/admin/airport-ivao-sync-all";
import { AirportSyncModal } from "@/components/admin/airport-sync-modal";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAirportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const queryValue = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const query = (queryValue ?? "").trim().toLowerCase();
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

  const filteredAirports = (query
    ? airports.filter(
        (a) =>
          a.icao.toLowerCase().includes(query) ||
          (a.name ?? "").toLowerCase().includes(query) ||
          (a.fir?.slug ?? "").toLowerCase().includes(query),
      )
    : airports
  ).sort((a, b) => Number(b.featured) - Number(a.featured) || a.icao.localeCompare(b.icao));

  return (
    <main className="space-y-6">
      <Card className="space-y-4 border border-[color:var(--border)] bg-[color:var(--surface-2)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Airports</p>
            <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">{t("cards.airports")}</h1>
            <p className="text-sm text-[color:var(--text-muted)]">
              Manage ICAO data, FIR links, coordinates, ATC frequencies, and layouts for Portuguese airports.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/${locale}/admin/airports/new`}>
              <Button size="sm">New airport</Button>
            </Link>
            <AirportSyncModal>
              <AirportIvaoSyncAll airports={airports.map((airport) => ({ id: airport.id, icao: airport.icao }))} />
            </AirportSyncModal>
          </div>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search ICAO, name, FIR"
            className="w-full min-w-[200px] flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
        <Card className="space-y-4 border border-[color:var(--border)] bg-[color:var(--surface-1,#111827)] p-4">
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
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {filteredAirports.map((airport) => (
                <div
                  key={airport.id}
                  className="flex flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-2 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                        <span>{airport.icao}</span>
                        {airport.featured ? (
                          <span className="rounded-full bg-[color:var(--primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--primary)]">
                            Featured
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[color:var(--text-muted)]">{airport.name}</p>
                      <p className="text-[11px] text-[color:var(--text-muted)]">{airport.fir?.slug ?? "No FIR"}</p>
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
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <AirportIvaoSyncCreate locale={locale} action={syncAirportByIcao} />

          <Card className="space-y-3 border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">FIR overview</p>
              <p className="text-xs text-[color:var(--text-muted)]">Grouped airports</p>
            </div>
            <div className="grid gap-3">
              {firs.map((fir) => (
                <div key={fir.id} className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-3)] p-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{fir.slug}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">{fir.name}</p>
                  </div>
                  <div className="max-h-40 space-y-1 overflow-auto pr-1">
                    {fir.airports.length === 0 ? (
                      <p className="text-xs text-[color:var(--text-muted)]">No airports</p>
                    ) : (
                      fir.airports.map((ap) => (
                        <Link
                          key={ap.id}
                          href={`/${locale}/admin/airports/${ap.id}`}
                          className="block rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-primary)] transition hover:border-[color:var(--primary)]"
                        >
                          {ap.icao} - {ap.name}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
