import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { importToursFromJsonAction } from "@/app/[locale]/(dashboard)/admin/tours/actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminToursPage({ params }: Props) {
  const { locale } = await params;
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

  const tours = await prisma.tour.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { legs: true, enrollments: true } },
    },
  });

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Tours</h1>
          <p className="text-xs text-[color:var(--text-muted)]">Create and manage tour series and legs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/tours/reports`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
            Pending reports
          </Link>
          <Link href={`/${locale}/admin/tours/new`} className={buttonClassNames({ size: "sm" })}>
            New tour
          </Link>
        </div>
      </div>

      <Card className="divide-y divide-[color:var(--border)]">
        {tours.length === 0 ? (
          <p role="status" className="p-4 text-sm text-[color:var(--text-muted)]">
            No tours yet.
          </p>
        ) : (
          tours.map((tour) => (
            <div key={tour.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                  {tour.title} {tour.code ? <span className="text-xs text-[color:var(--text-muted)]">({tour.code})</span> : null}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {tour.isPublished ? "Published" : "Draft"} - {tour._count.legs} legs - {tour._count.enrollments} enrolled
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/admin/tours/${tour.id}`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
                  Manage
                </Link>
              </div>
            </div>
          ))
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Import tours from JSON</h2>
          <p className="text-xs text-[color:var(--text-muted)]">Paste a tour object or array. Optionally include legs.</p>
        </div>
        <form action={importToursFromJsonAction} className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <textarea
            name="payload"
            rows={6}
            placeholder='{"title":"PTWINGMAN","code":"PTWINGMAN","legs":[{"legNumber":1,"departureCode":"LPMA","arrivalCode":"LPHR"}]}'
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Import tours
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
