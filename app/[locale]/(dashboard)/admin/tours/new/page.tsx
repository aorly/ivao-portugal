import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AircraftRuleField } from "@/components/ui/aircraft-input";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { createTourAction } from "@/app/[locale]/(dashboard)/admin/tours/actions";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminTourCreatePage({ params }: Props) {
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

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">New tour</h1>
          <p className="text-xs text-[color:var(--text-muted)]">Create a new tour series.</p>
        </div>
        <Link href={`/${locale}/admin/tours`} className={buttonClassNames({ size: "sm", variant: "secondary" })}>
          Back
        </Link>
      </div>

      <Card className="p-4">
        <form action={createTourAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Title</label>
              <input name="title" required className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Slug</label>
              <input name="slug" placeholder="ptwingman" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Code</label>
              <input name="code" placeholder="PTWINGMAN" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Forum link</label>
              <input name="forumUrl" placeholder="https://forums.ivao.aero/..." className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Image URL</label>
              <input name="imageUrl" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Award image URL</label>
              <input name="awardImageUrl" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Start date</label>
              <input type="date" name="startDate" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">End date</label>
              <input type="date" name="endDate" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Max flights/day</label>
              <input type="number" name="maxFlightsPerDay" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Min online %</label>
              <input type="number" name="minOnlinePercent" placeholder="75" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[color:var(--text-muted)]">Total legs required</label>
              <input type="number" name="totalLegsRequired" placeholder="25" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Allowed aircraft (optional)</label>
            <input name="allowedAircraft" placeholder="Any aircraft" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Description</label>
            <textarea name="description" rows={4} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[color:var(--text-muted)]">Rules</label>
            <textarea name="rules" rows={4} className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
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
                      <input type="checkbox" name="ruleAircraftEnabled" className="h-4 w-4" />
                      Aircraft types
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Restrict accepted ICAO aircraft types.</p>
                  </div>
                  <AircraftRuleField valueName="ruleAircraftValue" allowAnyName="allowAnyAircraft" defaultAllowAny placeholder="A320, A321" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-start">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleMaxSpeedEnabled" className="h-4 w-4" />
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
                        placeholder="450"
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-[color:var(--text-muted)]">kts</span>
                    </div>
                    <input
                      name="ruleMaxSpeedPublicLabel"
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
                      <input type="checkbox" name="ruleMaxLevelEnabled" className="h-4 w-4" />
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
                        placeholder="350"
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-[color:var(--text-muted)]">FL</span>
                    </div>
                    <input
                      name="ruleMaxLevelPublicLabel"
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
                      <input type="checkbox" name="ruleCallsignEnabled" className="h-4 w-4" />
                      Callsign prefix
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Require a specific prefix in the callsign.</p>
                  </div>
                  <input name="ruleCallsignValue" placeholder="RZO" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleRemarksEnabled" className="h-4 w-4" />
                      Mandatory remark
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Check the RMK field in the flight plan.</p>
                  </div>
                  <input name="ruleRemarksValue" placeholder="RMK/PT AZORES25" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleFlightRulesEnabled" className="h-4 w-4" />
                      Flight rules
                    </label>
                    <p className="text-xs text-[color:var(--text-muted)]">Validate IFR/VFR from the flight plan.</p>
                  </div>
                  <input name="ruleFlightRulesValue" placeholder="IFR" className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                <div className="grid gap-3 md:grid-cols-[1fr_380px] md:items-center">
                  <div className="space-y-1">
                    <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--text-primary)]">
                      <input type="checkbox" name="ruleMilitaryAllowed" className="h-4 w-4" />
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
              <input type="checkbox" name="enforceLegOrder" className="h-4 w-4" />
              Enforce leg order
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" name="isPublished" className="h-4 w-4" />
              Publish tour
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Create tour</Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
