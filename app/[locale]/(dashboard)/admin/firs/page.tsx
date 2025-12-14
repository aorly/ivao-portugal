import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { createFir, updateFirAirports, importFrequencies, updateFir, deleteFir } from "./actions";

type Props = {
  params: { locale: Locale };
};

export default async function AdminFirsPage({ params }: Props) {
  const t = await getTranslations({ locale: params.locale, namespace: "admin" });
  const [firs, airports] = await Promise.all([
    prisma.fir.findMany({
      orderBy: { slug: "asc" },
      include: { airports: { select: { id: true, icao: true, name: true } }, frequencies: true },
    }),
    prisma.airport.findMany({ orderBy: { icao: "asc" }, select: { id: true, icao: true, name: true } }),
  ]);

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">FIRs</p>
        {firs.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No FIRs yet.</p>
        ) : (
          <div className="space-y-2">
            {firs.map((fir) => (
              <div
                key={fir.id}
                className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm"
              >
                <p className="font-semibold text-[color:var(--text-primary)]">
                  {fir.slug} · {fir.name}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  Airports: {fir.airports.length} · Frequencies: {fir.frequencies.length}
                </p>
                <form action={updateFir} className="grid gap-2">
                  <input type="hidden" name="firId" value={fir.id} />
                  <input
                    name="slug"
                    defaultValue={fir.slug}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <input
                    name="name"
                    defaultValue={fir.name}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <textarea
                    name="boundaries"
                    defaultValue={fir.boundaries}
                    rows={2}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <textarea
                    name="description"
                    defaultValue={fir.description ?? ""}
                    rows={2}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                </form>
                <form action={deleteFir} className="pt-2">
                  <input type="hidden" name="firId" value={fir.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Delete
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create FIR</p>
        <form action={createFir} className="space-y-3">
          <input
            name="slug"
            placeholder="LPPC"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="name"
            placeholder="Lisboa FIR"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <textarea
            name="boundaries"
            placeholder="GeoJSON or FIR boundaries text"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            rows={3}
          />
          <textarea
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            rows={2}
          />
          <Button type="submit">Create FIR</Button>
        </form>
      </Card>

      <Card className="space-y-4 p-4 md:col-span-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Assign airports</p>
        <form action={updateFirAirports} className="space-y-3">
          <select
            name="firId"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {firs.map((fir) => (
              <option key={fir.id} value={fir.id}>
                {fir.slug} · {fir.name}
              </option>
            ))}
          </select>
          <div className="grid max-h-[260px] grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
            {airports.map((airport) => (
              <label key={airport.id} className="flex items-center gap-2 text-[color:var(--text-primary)]">
                <input type="checkbox" name="airportIds" value={airport.id} className="h-4 w-4" />
                <span className="text-xs">{airport.icao} · {airport.name}</span>
              </label>
            ))}
          </div>
          <Button type="submit" variant="secondary">Update Airports</Button>
        </form>
      </Card>

      <Card className="space-y-4 p-4 md:col-span-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Import ATC frequencies</p>
        <form action={importFrequencies} className="space-y-3" encType="multipart/form-data">
          <select
            name="firId"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="">(Optional) Attach to FIR</option>
            {firs.map((fir) => (
              <option key={fir.id} value={fir.id}>
                {fir.slug} · {fir.name}
              </option>
            ))}
          </select>
          <input
            name="freqFile"
            type="file"
            accept=".atc,.txt"
            className="w-full text-sm text-[color:var(--text-primary)]"
          />
          <Button type="submit">Import Frequencies</Button>
        </form>
      </Card>
    </main>
  );
}
