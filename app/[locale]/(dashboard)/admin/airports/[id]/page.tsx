import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAirport, updateAirport } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { RunwayEditor } from "@/components/admin/runway-editor";
import { FrequencyEditor } from "@/components/admin/frequency-editor";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AirportDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const airport = await prisma.airport.findUnique({
    where: { id },
    include: { fir: { select: { slug: true } }, stands: true },
  });
  const firs = await prisma.fir.findMany({ orderBy: { slug: "asc" }, select: { slug: true } });

  if (!airport) {
    notFound();
  }

  const runways = (() => {
    try {
      const parsed = JSON.parse(airport.runways ?? "[]");
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
    return [];
  })();

  return (
    <main className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airport</p>
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
              {airport.icao} — {airport.name}
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await deleteAirport(airport.id, locale);
            }}
          >
            <Button variant="ghost" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </div>

        <form
          action={async (formData) => {
            "use server";
            await updateAirport(airport.id, formData, locale);
          }}
          className="space-y-4"
        >
          <div className="grid gap-2 md:grid-cols-3">
            <input
              name="icao"
              defaultValue={airport.icao}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="iata"
              defaultValue={airport.iata ?? ""}
              placeholder="IATA"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="name"
              defaultValue={airport.name}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </div>
          <input
            name="fir"
            list="firs-list"
            defaultValue={airport.fir?.slug ?? ""}
            placeholder="FIR slug"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />

          <RunwayEditor name="runways" label="Runways" initial={runways} />
          <FrequencyEditor
            name="frequencies"
            label="ATC Frequencies"
            initial={(() => {
              try {
                const parsed = JSON.parse(airport.frequencies ?? "[]");
                if (Array.isArray(parsed)) {
                  return parsed.map((entry) => {
                    if (entry && typeof entry === "object" && "id" in entry && "value" in entry) {
                      return { id: String((entry as { id: unknown }).id), value: String((entry as { value: unknown }).value) };
                    }
                    if (typeof entry === "string") return { id: entry, value: entry };
                    return { id: "", value: "" };
                  }).filter((f) => f.id && f.value);
                }
              } catch {}
              return [];
            })()}
          />

          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">
            Stands — {airport.stands.length} loaded
          </p>
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/airports/${airport.id}/stands`}>
              <Button size="sm" variant="secondary">
                Import stands
              </Button>
            </Link>
          </div>
        </div>
        <div className="max-h-80 overflow-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
          <div className="grid gap-2 md:grid-cols-2">
            {airport.stands.map((stand) => (
              <div
                key={stand.id}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <p className="font-semibold">{stand.name}</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {stand.lat.toFixed(6)}, {stand.lon.toFixed(6)}
                </p>
              </div>
            ))}
          </div>
          {airport.stands.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No stands imported yet.</p>
          ) : null}
        </div>
      </Card>

      <datalist id="firs-list">
        {firs.map((f) => (
          <option key={f.slug} value={f.slug} />
        ))}
      </datalist>
    </main>
  );
}
