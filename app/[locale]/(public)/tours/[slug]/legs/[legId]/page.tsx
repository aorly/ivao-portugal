import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { submitTourLegReport } from "@/app/[locale]/(public)/tours/actions";
import { LegReportForm } from "@/components/tours/leg-report-form";

type Props = {
  params: Promise<{ locale: Locale; slug: string; legId: string }>;
  searchParams?: Promise<{ edit?: string }> | { edit?: string };
};

const formatDateInput = (value: Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

export default async function TourLegPage({ params, searchParams }: Props) {
  const { locale, slug, legId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isEditing = resolvedSearchParams?.edit === "1";
  const session = await auth();

  const leg = await prisma.tourLeg.findUnique({
    where: { id: legId },
    include: { tour: true },
  });
  if (!leg || leg.tour.slug !== slug) notFound();
  if (!leg.tour.isPublished) notFound();

  const enrollment = session?.user?.id
    ? await prisma.tourEnrollment.findUnique({
        where: { userId_tourId: { userId: session.user.id, tourId: leg.tourId } },
      })
    : null;

  const report = session?.user?.id
    ? await prisma.tourLegReport.findUnique({
        where: { userId_tourLegId: { userId: session.user.id, tourLegId: leg.id } },
      })
    : null;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{leg.tour.code ?? "Tour leg"}</p>
            <h1 className="text-2xl font-semibold">
              Leg {leg.legNumber}: {leg.departureCode} {"->"} {leg.arrivalCode}
            </h1>
          </div>
          <Link href={`/${locale}/tours/${leg.tour.slug}`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
            Back
          </Link>
        </div>

        <Card className="space-y-3 p-4 text-white">
          <h2 className="text-lg font-semibold">Briefing</h2>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{leg.briefing ?? "No briefing published yet."}</p>
          <div className="flex flex-wrap gap-4 text-xs text-white/60">
            <span>{leg.distanceNm ? `${leg.distanceNm} nm` : "Distance TBD"}</span>
            <span>{leg.eteMinutes ? `${leg.eteMinutes} min` : "ETE TBD"}</span>
            <span>{leg.maxSpeed ? `Max speed ${leg.maxSpeed}` : "Max speed TBD"}</span>
            <span>{leg.maxAltitudeFt ? `Max altitude ${leg.maxAltitudeFt} ft` : "Max altitude TBD"}</span>
          </div>
        </Card>

        <Card className="space-y-4 p-4 text-white">
          <h2 className="text-lg font-semibold">File PIREP</h2>
          {!session?.user?.id ? (
            <p className="text-sm text-white/70">Log in to file a report.</p>
          ) : !enrollment ? (
            <p className="text-sm text-white/70">You must accept the tour before filing a report.</p>
          ) : report && !isEditing ? (
            <div className="space-y-3 text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Submitted report</p>
              <div className="grid gap-2 md:grid-cols-2">
                <p>
                  <span className="font-semibold text-white">Status:</span> {report.status}
                </p>
                <p>
                  <span className="font-semibold text-white">Flight date:</span>{" "}
                  {report.flightDate ? new Date(report.flightDate).toLocaleString(locale) : "-"}
                </p>
                <p>
                  <span className="font-semibold text-white">Callsign:</span> {report.callsign ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-white">Aircraft:</span> {report.aircraft ?? "-"}
                </p>
                <p className="md:col-span-2">
                  <span className="font-semibold text-white">Route:</span> {report.route ?? "-"}
                </p>
                <p>
                  <span className="font-semibold text-white">Online:</span> {report.online ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-semibold text-white">Evidence URL:</span>{" "}
                  {report.evidenceUrl ?? "-"}
                </p>
              </div>
              <Link
                href={`/${locale}/tours/${leg.tour.slug}/legs/${leg.id}?edit=1`}
                className={buttonClassNames({ size: "sm" })}
              >
                Edit report
              </Link>
            </div>
          ) : (
            <>
              {report ? (
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Editing submitted report</span>
                  <Link href={`/${locale}/tours/${leg.tour.slug}/legs/${leg.id}`} className="underline underline-offset-4">
                    Cancel
                  </Link>
                </div>
              ) : null}
              <LegReportForm
                action={submitTourLegReport}
                legId={leg.id}
                slug={leg.tour.slug}
                locale={locale}
                validationRules={leg.tour.validationRules ?? null}
                defaults={{
                  flightDate: formatDateInput(report?.flightDate ?? null),
                  callsign: report?.callsign ?? "",
                  aircraft: report?.aircraft ?? "",
                  route: report?.route ?? "",
                  evidenceUrl: report?.evidenceUrl ?? "",
                  online: report?.online ?? false,
                }}
              />
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
