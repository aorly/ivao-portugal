import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { joinTour } from "@/app/[locale]/(public)/tours/actions";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

type ValidationRule = {
  key: string;
  value?: string | null;
  public?: boolean;
  publicLabel?: string | null;
};

const parseValidationRules = (value: string | null) => {
  if (!value) return [] as ValidationRule[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ValidationRule[];
  } catch {
    // fall through
  }
  return [];
};

const getPublicRuleLabel = (rule: ValidationRule) => {
  if (rule.publicLabel) return rule.publicLabel;
  switch (rule.key) {
    case "aircraft":
      return rule.value ? `Allowed aircraft: ${rule.value}` : "Allowed aircraft";
    case "maxSpeed":
      return rule.value ? `Max speed: ${rule.value}` : "Max speed";
    case "maxLevel":
      return rule.value ? `Max flight level: ${rule.value}` : "Max flight level";
    case "callsign":
      return rule.value ? `Callsign prefix: ${rule.value}` : "Callsign prefix required";
    case "remarks":
      return rule.value ? `Mandatory remark: ${rule.value}` : "Mandatory remark";
    case "flightRules":
      return rule.value ? `Flight rules: ${rule.value}` : "Flight rules required";
    case "military":
      return rule.value === "allowed" ? "Military flights allowed" : "Military flights not allowed";
    default:
      return rule.value ?? "Rule";
  }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const tour = await prisma.tour.findUnique({ where: { slug } });
  if (!tour || !tour.isPublished) {
    return {
      title: "Tour not available",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: tour.title,
    description: tour.description ?? "IVAO Portugal tour details.",
    alternates: { canonical: absoluteUrl(`/${locale}/tours/${tour.slug}`) },
  };
}

const formatRange = (locale: string, start: Date | null, end: Date | null) => {
  if (!start && !end) return "Dates TBD";
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  if (start && end) return `${fmt.format(start)} - ${fmt.format(end)}`;
  if (start) return `From ${fmt.format(start)}`;
  if (end) return `Until ${fmt.format(end)}`;
  return "Dates TBD";
};

export default async function TourDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const session = await auth();

  const tour = await prisma.tour.findUnique({
    where: { slug },
    include: { legs: { orderBy: { legNumber: "asc" } } },
  });
  if (!tour || !tour.isPublished) notFound();
  const publicRules = parseValidationRules(tour.validationRules).filter((rule) => {
    if (rule.key === "aircraft" && tour.allowAnyAircraft) return false;
    return true;
  });

  const enrollment = session?.user?.id
    ? await prisma.tourEnrollment.findUnique({
        where: { userId_tourId: { userId: session.user.id, tourId: tour.id } },
      })
    : null;
  const reports = session?.user?.id
    ? await prisma.tourLegReport.findMany({
        where: { userId: session.user.id, tourLeg: { tourId: tour.id } },
      })
    : [];
  const reportByLeg = new Map(reports.map((r) => [r.tourLegId, r]));
  const approvedCount = reports.filter((r) => r.status === "APPROVED").length;

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-white">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">{tour.code ?? "Tour"}</p>
          <h1 className="text-2xl font-semibold">{tour.title}</h1>
          <p className="text-sm text-white/70">{formatRange(locale, tour.startDate, tour.endDate)}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="space-y-4 p-4 text-white">
            <h2 className="text-lg font-semibold">Details</h2>
            {tour.imageUrl ? <img src={tour.imageUrl} alt={`${tour.title} image`} className="w-full rounded-md object-cover" /> : null}
            <p className="text-sm text-white/80 whitespace-pre-wrap">{tour.description ?? "Tour details coming soon."}</p>
            <div className="grid gap-2 text-sm text-white/70">
              <p>
                <span className="font-semibold text-white">Max flights/day:</span> {tour.maxFlightsPerDay ?? "N/A"}
              </p>
              <p>
                <span className="font-semibold text-white">Leg order required:</span> {tour.enforceLegOrder ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-semibold text-white">Aircraft:</span> {tour.allowAnyAircraft ? "Any aircraft" : tour.allowedAircraft ?? "Restricted"}
              </p>
              <p>
                <span className="font-semibold text-white">Online minimum:</span> {tour.minOnlinePercent ? `${tour.minOnlinePercent}%` : "N/A"}
              </p>
            </div>
            {tour.awardImageUrl ? (
              <div className="flex items-center gap-3">
                <img src={tour.awardImageUrl} alt="Award" className="h-12 w-12 object-contain" />
                <span className="text-sm text-white/70">Tour award</span>
              </div>
            ) : null}
            {publicRules.length > 0 ? (
              <div className="space-y-2 text-sm text-white/70">
                <p className="font-semibold text-white">Automation rules</p>
                <ul className="space-y-1">
                  {publicRules.map((rule, idx) => (
                    <li key={`${rule.key}-${idx}`}>{getPublicRuleLabel(rule)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="space-y-4 p-4 text-white">
            <h2 className="text-lg font-semibold">Status</h2>
            {!session?.user?.id ? (
              <p className="text-sm text-white/70">Log in to join and report legs.</p>
            ) : !enrollment ? (
              <>
                <p className="text-sm text-white/70">You have not started this tour yet.</p>
                <form action={joinTour}>
                  <input type="hidden" name="tourId" value={tour.id} />
                  <input type="hidden" name="slug" value={tour.slug} />
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit" size="sm">
                    Accept tour
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">
                  Progress: {approvedCount}/{tour.legs.length} approved legs
                </p>
                <p className="text-xs text-white/50">Accepted on {new Date(enrollment.acceptedAt).toLocaleDateString(locale)}</p>
              </>
            )}
          </Card>
        </div>

        <Card className="space-y-4 p-4 text-white">
          <h2 className="text-lg font-semibold">Rules</h2>
          <p className="text-sm text-white/80 whitespace-pre-wrap">{tour.rules ?? "No special rules for this tour."}</p>
        </Card>

        <Card className="space-y-4 p-4 text-white">
          <h2 className="text-lg font-semibold">Legs</h2>
          {tour.legs.length === 0 ? (
            <p className="text-sm text-white/70">No legs published yet.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {tour.legs.map((leg) => {
                const report = reportByLeg.get(leg.id);
                const statusLabel = report ? report.status : "Not filed";
                const statusClass =
                  report?.status === "APPROVED"
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : report?.status === "REJECTED"
                      ? "border-rose-400/40 bg-rose-500/10"
                      : report?.status === "PENDING"
                        ? "border-amber-400/40 bg-amber-500/10"
                        : "border-white/10 bg-white/5";
                const statusText =
                  report?.status === "APPROVED"
                    ? "text-emerald-200"
                    : report?.status === "REJECTED"
                      ? "text-rose-200"
                      : report?.status === "PENDING"
                        ? "text-amber-200"
                        : "text-white/60";
                return (
                  <div key={leg.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 ${statusClass}`}>
                    <div>
                      <p className="font-semibold">
                        Leg {leg.legNumber}: {leg.departureCode} {"->"} {leg.arrivalCode}
                      </p>
                      <p className={`text-xs ${statusText}`}>
                        {leg.distanceNm ? `${leg.distanceNm} nm` : "Distance TBD"} - {leg.eteMinutes ? `${leg.eteMinutes} min` : "ETE TBD"} - {statusLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report ? (
                        <Link
                          href={`/${locale}/tours/${tour.slug}/legs/${leg.id}`}
                          className={buttonClassNames({ size: "sm", variant: "secondary" })}
                        >
                          View report
                        </Link>
                      ) : enrollment ? (
                        <Link href={`/${locale}/tours/${tour.slug}/legs/${leg.id}`} className={buttonClassNames({ size: "sm" })}>
                          File report
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
