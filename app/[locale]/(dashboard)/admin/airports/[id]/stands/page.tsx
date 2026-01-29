import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { importStandsAndRedirect } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AirportStandsPage({ params }: Props) {
  const { locale, id } = await params;
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
  const airport = await prisma.airport.findUnique({
    where: { id },
    select: { id: true, icao: true, name: true, stands: true },
  });

  if (!airport) {
    return null;
  }

  const standsCount = airport.stands.length;

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airport</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
            {airport.icao} — {airport.name}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)]">Import stands from .gts</p>
        </div>
        <Link href={`/${locale}/admin/airports/${airport.id}?tab=stands`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm text-[color:var(--text-muted)]">
          Current stands: {standsCount}. Upload a .gts file (semicolon separated: id;apt;lat;lon).
        </p>
        <form
          action={async (formData) => {
            "use server";
            await importStandsAndRedirect(formData, airport.id, locale);
          }}
          className="space-y-2"
        >
          <input
            type="file"
            name="standsFile"
            accept=".gts,.txt"
            className="w-full text-sm text-[color:var(--text-primary)]"
            required
          />
          <Button size="sm" type="submit">
            Upload stands
          </Button>
        </form>
      </Card>
    </main>
  );
}
