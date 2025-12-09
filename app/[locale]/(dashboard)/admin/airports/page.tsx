import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteAirport } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminAirportsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const airports = await prisma.airport.findMany({
    orderBy: { icao: "asc" },
    take: 30,
    include: { fir: { select: { slug: true } } },
  });

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.airports")}</p>
          <Link href={`/${locale}/admin/airports/new`}>
            <Button size="sm">New</Button>
          </Link>
        </div>
        {airports.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">{t("cards.airportForm")}</p>
        ) : (
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {airports.map((airport) => (
              <li
                key={airport.id}
                className="flex items-center justify-between rounded-xl bg-[color:var(--surface-3)] p-3"
              >
                <div>
                  <p className="font-semibold text-[color:var(--text-primary)]">
                    {airport.icao} – {airport.name}
                  </p>
                  <p className="text-xs">{airport.fir?.slug ?? "No FIR"}</p>
                </div>
                <div className="flex items-center gap-2">
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
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
