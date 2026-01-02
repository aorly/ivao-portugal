import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { AircraftRuleField } from "@/components/ui/aircraft-input";
import { SaveToast } from "@/components/ui/save-toast";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { deleteLeg, deleteTour, importLegsFromJsonAction, reviewTourLegReport, updateTourAction } from "@/app/[locale]/(dashboard)/admin/tours/actions";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

type ValidationRule = {
  key: string;
  value?: string | null;
  public?: boolean;
  publicLabel?: string | null;
};

const normalizeReviewNote = (value: string | null) => {
  if (!value) return "";
  return value.replace(
    /Auto-validation failed: flight date must be within .*? submission\./i,
    "Auto-validation failed: flight date is required.",
  );
};

const formatDateInput = (value: Date | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const parseValidationRules = (value: string | null) => {
  if (!value) return new Map<string, ValidationRule>();
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const map = new Map<string, ValidationRule>();
      parsed.forEach((rule) => {
        if (rule && typeof rule === "object" && "key" in rule) {
          map.set(String((rule as any).key), rule as ValidationRule);
        }
      });
      return map;
    }
  } catch {
    // fall through
  }
  return new Map<string, ValidationRule>();
};

export default async function AdminTourDetailPage({ params }: Props) {
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

  const tour = await prisma.tour.findUnique({
    where: { id },
    include: { legs: { orderBy: { legNumber: "asc" } } },
  });
  if (!tour) notFound();
  const rulesMap = parseValidationRules(tour.validationRules);
  const rule = (key: string) => rulesMap.get(key);

  const enrollmentsCount = await prisma.tourEnrollment.count({ where: { tourId: id } });
  const reports = await prisma.tourLegReport.findMany({
    where: { tourLeg: { tourId: id } },
    include: {
      user: { select: { id: true, name: true, vid: true } },
      tourLeg: { select: { id: true, legNumber: true, departureCode: true, arrivalCode: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <main className="space-y-6">
      <SaveToast message="Tour saved." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">{tour.title}</h1>
          <p className="text-xs text-[color:var(--text-muted)]">
            {tour.isPublished ? "Published" : "Draft"} - {tour.legs.length} legs - {enrollmentsCount} enrolled
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/tours`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
            Back
          </Link>
          <form action={deleteTour}>
            <input type="hidden" name="tourId" value={tour.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button size="sm" variant="secondary" type="submit">
              Delete tour
            </Button>
          </form>
        </div>
      </div>

      <Card className="p-4">
        <form action={updateTourAction} className="space-y-4">
          <input type="hidden" name="tourId" value={tour.id} />
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Title</label>
              <input name="title" defaultValue={tour.title} required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Slug</label>
              <input name="slug" defaultValue={tour.slug} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Code</label>
              <input name="code" defaultValue={tour.code ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Forum link</label>
              <input name="forumUrl" defaultValue={tour.forumUrl ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Image URL</label>
              <input name="imageUrl" defaultValue={tour.imageUrl ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Award image URL</label>
              <input name="awardImageUrl" defaultValue={tour.awardImageUrl ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Start date</label>
              <input type="date" name="startDate" defaultValue={formatDateInput(tour.startDate)} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">End date</label>
              <input type="date" name="endDate" defaultValue={formatDateInput(tour.endDate)} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max flights/day</label>
              <input type="number" name="maxFlightsPerDay" defaultValue={tour.maxFlightsPerDay ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Min online %</label>
              <input type="number" name="minOnlinePercent" defaultValue={tour.minOnlinePercent ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Total legs required</label>
              <input type="number" name="totalLegsRequired" defaultValue={tour.totalLegsRequired ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Allowed aircraft (optional)</label>
            <input name="allowedAircraft" defaultValue={tour.allowedAircraft ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Description</label>
            <textarea name="description" rows={4} defaultValue={tour.description ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Rules</label>
            <textarea name="rules" rows={4} defaultValue={tour.rules ?? ""} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Automation rules</p>
              <p className="text-xs text-[color:var(--text-muted)]">Enable only the checks you want to enforce.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-start">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleAircraftEnabled" defaultChecked={Boolean(rule("aircraft"))} className="h-4 w-4" />
                      Aircraft types
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Restrict accepted ICAO aircraft types.</p>
                  </div>
                  <AircraftRuleField
                    valueName="ruleAircraftValue"
                    allowAnyName="allowAnyAircraft"
                    defaultValue={rule("aircraft")?.value ?? ""}
                    defaultAllowAny={tour.allowAnyAircraft}
                    placeholder="A320, A321"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-start">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleMaxSpeedEnabled" defaultChecked={Boolean(rule("maxSpeed"))} className="h-4 w-4" />
                      Max speed (kts)
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Internal threshold for auto-validation.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="ruleMaxSpeedValue"
                        inputMode="numeric"
                        min={1}
                        max={999}
                        defaultValue={rule("maxSpeed")?.value ?? ""}
                        placeholder="450"
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-[color:var(--text-muted)]">kts</span>
                    </div>
                    <input
                      name="ruleMaxSpeedPublicLabel"
                      defaultValue={rule("maxSpeed")?.publicLabel ?? ""}
                      placeholder="Public label (e.g. VMO/MMO: 350/0.82)"
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-start">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleMaxLevelEnabled" defaultChecked={Boolean(rule("maxLevel"))} className="h-4 w-4" />
                      Max flight level
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Internal threshold for auto-validation.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="ruleMaxLevelValue"
                        inputMode="numeric"
                        min={1}
                        max={999}
                        defaultValue={rule("maxLevel")?.value ?? ""}
                        placeholder="350"
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-[color:var(--text-muted)]">FL</span>
                    </div>
                    <input
                      name="ruleMaxLevelPublicLabel"
                      defaultValue={rule("maxLevel")?.publicLabel ?? ""}
                      placeholder="Public label (e.g. Max FL350)"
                      className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleCallsignEnabled" defaultChecked={Boolean(rule("callsign"))} className="h-4 w-4" />
                      Callsign prefix
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Require a specific prefix in the callsign.</p>
                  </div>
                  <input name="ruleCallsignValue" defaultValue={rule("callsign")?.value ?? ""} placeholder="RZO" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleRemarksEnabled" defaultChecked={Boolean(rule("remarks"))} className="h-4 w-4" />
                      Mandatory remark
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Check the RMK field in the flight plan.</p>
                  </div>
                  <input name="ruleRemarksValue" defaultValue={rule("remarks")?.value ?? ""} placeholder="RMK/PT AZORES25" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleFlightRulesEnabled" defaultChecked={Boolean(rule("flightRules"))} className="h-4 w-4" />
                      Flight rules
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Validate IFR/VFR from the flight plan.</p>
                  </div>
                  <input name="ruleFlightRulesValue" defaultValue={rule("flightRules")?.value ?? ""} placeholder="IFR" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleMilitaryAllowed" defaultChecked={(rule("military")?.value ?? "forbidden") == "allowed"} className="h-4 w-4" />
                      Military flight allowed
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Unchecked means military flights are not allowed.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="enforceLegOrder" defaultChecked={tour.enforceLegOrder} className="h-4 w-4" />
              Enforce leg order
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="isPublished" defaultChecked={tour.isPublished} className="h-4 w-4" />
              Publish tour
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Legs</h2>
          <Link href={`/${locale}/admin/tours/${tour.id}/legs/new`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
            Add leg
          </Link>
        </div>
        {tour.legs.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No legs yet.</p>
        ) : (
          <div className="space-y-2 text-sm">
            {tour.legs.map((leg) => (
              <div key={leg.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    Leg {leg.legNumber}: {leg.departureCode} {"->"} {leg.arrivalCode}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {leg.distanceNm ? `${leg.distanceNm} nm` : "Distance TBD"} - {leg.eteMinutes ? `${leg.eteMinutes} min` : "ETE TBD"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/admin/tours/${tour.id}/legs/${leg.id}`}
                    className={buttonClassNames({ size: "sm", variant: "secondary" })}
                  >
                    Edit
                  </Link>
                  <form action={deleteLeg}>
                    <input type="hidden" name="legId" value={leg.id} />
                    <input type="hidden" name="tourId" value={tour.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <Button size="sm" variant="secondary" type="submit">
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Import legs from JSON</h2>
          <p className="text-xs text-[color:var(--text-muted)]">Paste a leg object or array.</p>
        </div>
        <form action={importLegsFromJsonAction} className="space-y-3">
          <input type="hidden" name="tourId" value={tour.id} />
          <input type="hidden" name="locale" value={locale} />
          <textarea
            name="payload"
            rows={5}
            placeholder='[{"legNumber":1,"departureCode":"LPMA","arrivalCode":"LPHR","distanceNm":679}]'
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Import legs
            </Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Pending reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No reports yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
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
                </div>
                <form action={reviewTourLegReport} className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_auto]">
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="tourId" value={tour.id} />
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
        )}
      </Card>
    </main>
  );
}
