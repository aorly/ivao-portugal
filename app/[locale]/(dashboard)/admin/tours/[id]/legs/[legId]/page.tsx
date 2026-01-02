import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { updateLeg } from "@/app/[locale]/(dashboard)/admin/tours/actions";

type Props = {
  params: Promise<{ locale: Locale; id: string; legId: string }>;
};

const formatDateInput = (value: Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default async function AdminTourLegEditPage({ params }: Props) {
  const { locale, id, legId } = await params;
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

  const leg = await prisma.tourLeg.findUnique({
    where: { id: legId },
    include: { tour: true },
  });
  if (!leg || leg.tourId !== id) notFound();

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">
            Edit leg {leg.legNumber}: {leg.departureCode} → {leg.arrivalCode}
          </h1>
          <p className="text-xs text-[color:var(--text-muted)]">{leg.tour.title}</p>
        </div>
        <Link href={`/${locale}/admin/tours/${leg.tourId}`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
          Back
        </Link>
      </div>

      <Card className="p-4">
        <form action={updateLeg} className="space-y-4">
          <input type="hidden" name="legId" value={leg.id} />
          <input type="hidden" name="tourId" value={leg.tourId} />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Leg number</label>
              <input type="number" name="legNumber" defaultValue={leg.legNumber} required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Scheduled date (optional)</label>
              <input type="date" name="scheduledDate" defaultValue={formatDateInput(leg.scheduledDate)} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Departure ICAO</label>
              <input name="departureCode" defaultValue={leg.departureCode} required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Arrival ICAO</label>
              <input name="arrivalCode" defaultValue={leg.arrivalCode} required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Distance (nm)</label>
              <input type="number" name="distanceNm" defaultValue={leg.distanceNm ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">ETE (minutes)</label>
              <input type="number" name="eteMinutes" defaultValue={leg.eteMinutes ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max speed</label>
              <input name="maxSpeed" defaultValue={leg.maxSpeed ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max altitude (ft)</label>
              <input type="number" name="maxAltitudeFt" defaultValue={leg.maxAltitudeFt ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Briefing</label>
            <textarea name="briefing" rows={4} defaultValue={leg.briefing ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save leg</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
