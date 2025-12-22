import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createAirport } from "@/app/[locale]/(dashboard)/admin/airports/actions";
import { RunwayEditor } from "@/components/admin/runway-editor";
import { LinkListInput } from "@/components/admin/link-list-input";
import { SubmitButton } from "@/components/admin/submit-button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function NewAirportPage({ params }: Props) {
  const { locale } = await params;
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
  const firs = await prisma.fir.findMany({ orderBy: { slug: "asc" }, select: { slug: true } });

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airport</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Create airport</h1>
        </div>
        <Link href={`/${locale}/admin/airports`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>
      <Card className="space-y-4 p-4">
        <form
          action={async (formData) => {
            "use server";
            await createAirport(formData, locale);
          }}
          className="space-y-4"
        >
          <div className="grid gap-2 md:grid-cols-3">
            <input
              name="icao"
              required
              placeholder="ICAO"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="iata"
              placeholder="IATA"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="name"
              required
              placeholder="Name"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              name="lat"
              required
              placeholder="Latitude"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="lon"
              required
              placeholder="Longitude"
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </div>
          <input
            name="fir"
            list="firs-list"
            placeholder="FIR slug"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <RunwayEditor name="runways" label="Runways" initial={[]} />
          <LinkListInput label="Charts" namePrefix="chart" initial={[]} placeholder="https://charts.example.com" withSimulator={false} />
          <LinkListInput label="Sceneries" namePrefix="scenery" initial={[]} placeholder="https://scenery.example.com" />

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </Card>
      <datalist id="firs-list">
        {firs.map((f) => (
          <option key={f.slug} value={f.slug} />
        ))}
      </datalist>
    </main>
  );
}
