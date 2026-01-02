import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { SaveToast } from "@/components/ui/save-toast";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { refreshToursReportsAction, reviewTourLegReport } from "@/app/[locale]/(dashboard)/admin/tours/actions";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

type FilterMode = "pending" | "rejected" | "auto" | "all";

const normalizeReviewNote = (value: string | null) => {
  if (!value) return "";
  return value.replace(
    /Auto-validation failed: flight date must be within .*? submission\./i,
    "Auto-validation failed: flight date is required.",
  );
};

const getFilterMode = (value: string | string[] | undefined): FilterMode => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "auto") return "auto";
  if (raw === "rejected") return "rejected";
  if (raw === "all") return "all";
  return "pending";
};

export default async function AdminTourReportsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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

  const filter = getFilterMode(resolvedSearchParams?.status);
  const where =
    filter === "pending"
      ? { status: { in: ["PENDING", "pending"] } }
      : filter === "rejected"
        ? { status: { in: ["REJECTED", "rejected"] } }
      : filter === "auto"
        ? { reviewNote: { contains: "Auto-approved" } }
        : {
            OR: [
              { status: { in: ["PENDING", "pending"] } },
              { status: { in: ["REJECTED", "rejected"] } },
              { reviewNote: { contains: "Auto-approved" } },
            ],
          };

  const reports = await prisma.tourLegReport.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, vid: true } },
      tourLeg: {
        select: {
          id: true,
          legNumber: true,
          departureCode: true,
          arrivalCode: true,
          tour: { select: { id: true, title: true, slug: true } },
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const grouped = reports.reduce((acc, report) => {
    const tourId = report.tourLeg.tour.id;
    const list = acc.get(tourId) ?? [];
    list.push(report);
    acc.set(tourId, list);
    return acc;
  }, new Map<string, typeof reports>());

  const tabLink = (status: FilterMode, label: string) => (
    <Link
      href={`/${locale}/admin/tours/reports?status=${status}`}
      className={buttonClassNames({ size: "sm", variant: filter === status ? "secondary" : "ghost" })}
    >
      {label}
    </Link>
  );

  return (
    <main className="space-y-4">
      <SaveToast title="Refreshed" message="Tour reports updated." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Tour reports</h1>
          <p className="text-xs text-[color:var(--text-muted)]">Grouped by tour with filters for pending/auto approvals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={refreshToursReportsAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="status" value={filter} />
            <Button size="sm" variant="secondary" type="submit">
              Refresh reports
            </Button>
          </form>
          <Link href={`/${locale}/admin/tours`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
            Back to tours
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabLink("pending", "Pending")}
        {tabLink("rejected", "Rejected")}
        {tabLink("auto", "Auto-approved")}
        {tabLink("all", "All")}
      </div>

      <Card className="space-y-3 p-4">
        {reports.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No reports in this view.</p>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([tourId, items]) => {
              const tourTitle = items[0]?.tourLeg.tour.title ?? "Tour";
              return (
                <section key={tourId} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">{tourTitle}</h2>
                      <p className="text-xs text-[color:var(--text-muted)]">{items.length} reports</p>
                    </div>
                    <Link
                      href={`/${locale}/admin/tours/${tourId}`}
                      className={buttonClassNames({ size: "sm", variant: "secondary" })}
                    >
                      Open tour
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {items.map((report) => (
                      <div key={report.id} className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-[color:var(--text-primary)]">
                              {report.user?.name ?? "Member"} ({report.user?.vid ?? "VID"}) - Leg {report.tourLeg.legNumber} {report.tourLeg.departureCode} {"->"} {report.tourLeg.arrivalCode}
                            </p>
                            <p className="text-xs text-[color:var(--text-muted)]">
                              Submitted {new Date(report.submittedAt).toLocaleString(locale)} - Status {report.status}
                            </p>
                          </div>
                          <Link
                            href={`/${locale}/admin/tours/reports/${report.id}`}
                            className={buttonClassNames({ size: "sm", variant: "secondary" })}
                          >
                            View report
                          </Link>
                        </div>
                        <form action={reviewTourLegReport} className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_auto]">
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="tourId" value={report.tourLeg.tour.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <select name="status" defaultValue={report.status} className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm">
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                          <input name="reviewNote" defaultValue={normalizeReviewNote(report.reviewNote)} placeholder="Review note (optional)" className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm" />
                          <Button size="sm" type="submit">
                            Update
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}
