import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { createLeg } from "@/app/[locale]/(dashboard)/admin/tours/actions";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AdminTourLegCreatePage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:tours");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const tour = await prisma.tour.findUnique({ where: { id } });
  if (!tour) notFound();

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Add leg</h1>
          <p className="text-xs text-[color:var(--text-muted)]">{tour.title}</p>
        </div>
        <Link href={`/${locale}/admin/tours/${tour.id}`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
          Back
        </Link>
      </div>

      <Card className="p-4">
        <form action={createLeg} className="space-y-4">
          <input type="hidden" name="tourId" value={tour.id} />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Leg number</label>
              <input type="number" name="legNumber" required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Scheduled date (optional)</label>
              <input type="date" name="scheduledDate" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Departure ICAO</label>
              <input name="departureCode" required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Arrival ICAO</label>
              <input name="arrivalCode" required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Distance (nm)</label>
              <input type="number" name="distanceNm" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">ETE (minutes)</label>
              <input type="number" name="eteMinutes" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max speed</label>
              <input name="maxSpeed" placeholder="Vmo/Mmo" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max altitude (ft)</label>
              <input type="number" name="maxAltitudeFt" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Briefing</label>
            <textarea name="briefing" rows={4} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create leg</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
