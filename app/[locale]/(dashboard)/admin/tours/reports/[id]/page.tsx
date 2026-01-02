import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Button, buttonClassNames } from "@/components/ui/button";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { reviewTourLegReport } from "@/app/[locale]/(dashboard)/admin/tours/actions";
import { ivaoClient } from "@/lib/ivaoClient";
import { TracksMap } from "@/components/map/tracks-map";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

const normalizeReviewNote = (value: string | null) => {
  if (!value) return "";
  return value.replace(
    /Auto-validation failed: flight date must be within .*? submission\./i,
    "Auto-validation failed: flight date is required.",
  );
};

type ValidationRule = {
  key: string;
  value?: string | null;
  public?: boolean;
  publicLabel?: string | null;
};


const getPlanValue = (plan: any, keys: string[]) => {
  for (const key of keys) {
    const value = plan?.[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) return value.join(" ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  }
  return "-";
};

const formatDuration = (value: unknown) => {
  if (value == null) return "-";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "-";
    if (trimmed.includes(":")) return trimmed;
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric)) {
      const hours = Math.floor(numeric / 3600);
      const minutes = Math.floor((numeric % 3600) / 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }
    return trimmed;
  }
  if (typeof value === "number") {
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  return String(value);
};

const getPlanDuration = (plan: any, keys: string[]) => {
  for (const key of keys) {
    const value = plan?.[key];
    if (value === undefined || value === null || value === "") continue;
    return formatDuration(value);
  }
  return "-";
};
const parseTimestamp = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  return null;
};
const parseCoord = (val: unknown) => {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const cleaned = val.replace(",", ".");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  return null;
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
    // ignore
  }
  return new Map<string, ValidationRule>();
};

const normalizeRuleValue = (value?: string | null) => (value ?? "").trim().toUpperCase();

const parseNumeric = (value: unknown) => {
  if (value == null) return null;
  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  if (raw.startsWith("M")) return null;
  const match = raw.match(/(\d{2,5})/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
};

const parseFlightRules = (value: unknown) => {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (raw === "I") return "IFR";
  if (raw === "V") return "VFR";
  if (raw === "Y") return "IFR";
  if (raw === "Z") return "VFR";
  return raw;
};

export default async function AdminTourReportDetailPage({ params }: Props) {
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

  const report = await prisma.tourLegReport.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, vid: true, email: true } },
      tourLeg: {
        include: {
          tour: { select: { id: true, title: true, slug: true, validationRules: true } },
        },
      },
    },
  });

  if (!report) notFound();

  const sessionCandidates = report.callsign && report.user?.vid
    ? await ivaoClient
        .getTrackerSessions({
          userId: report.user.vid,
          callsign: report.callsign,
          connectionType: "PILOT",
          perPage: 10,
          page: 1,
        })
        .catch(() => ({ items: [] }))
    : { items: [] };
  const items = Array.isArray((sessionCandidates as any)?.items) ? (sessionCandidates as any).items : [];
  const flightDate = report.flightDate ? new Date(report.flightDate) : null;
  const match = items.find((item: any) => {
    if (!flightDate) return true;
    const created = item?.createdAt ? new Date(item.createdAt) : null;
    const completed = item?.completedAt ? new Date(item.completedAt) : null;
    if (!created || !completed) return false;
    return flightDate >= created && flightDate <= completed;
  });
  const sessionId = match?.id ?? items[0]?.id ?? null;
  const flightPlansRaw = sessionId ? await ivaoClient.getTrackerSessionFlightPlans(sessionId).catch(() => []) : [];
  const flightPlans =
    Array.isArray(flightPlansRaw) ? flightPlansRaw : Array.isArray((flightPlansRaw as any)?.items) ? (flightPlansRaw as any).items : [];
  const payloadPlans =
    Array.isArray(match?.flightPlans) ? match.flightPlans : Array.isArray(items[0]?.flightPlans) ? items[0].flightPlans : [];
  const flightPlansCombined = flightPlans.length ? flightPlans : payloadPlans;
  const tracksRaw = sessionId ? await ivaoClient.getTrackerSessionTracks(sessionId).catch(() => []) : [];
  const tracks =
    Array.isArray(tracksRaw) ? tracksRaw : Array.isArray((tracksRaw as any)?.items) ? (tracksRaw as any).items : [];
  const session = match ?? items[0] ?? null;
  const primaryPlan = flightPlansCombined[0] ?? null;
  const trackMetaPoints = tracks
    .map((track: any) => {
      const lat = parseCoord(
        track?.latitude ??
          track?.lat ??
          track?.position?.latitude ??
          track?.position?.lat ??
          track?.location?.latitude ??
          track?.location?.lat,
      );
      const lon = parseCoord(
        track?.longitude ??
          track?.lon ??
          track?.position?.longitude ??
          track?.position?.lon ??
          track?.location?.longitude ??
          track?.location?.lon,
      );
      if (lat == null || lon == null) return null;
      const time = parseTimestamp(
        track?.timestamp ??
          track?.time ??
          track?.createdAt ??
          track?.updatedAt ??
          track?.logonTime,
      );
      const speed = parseCoord(
        track?.groundSpeed ??
          track?.speed ??
          track?.velocity ??
          track?.gs,
      );
      const alt = parseCoord(
        track?.altitude ??
          track?.alt ??
          track?.altitudeFt ??
          track?.altitude_ft ??
          track?.height,
      );
      const onGround = typeof track?.onGround === "boolean" ? track.onGround : typeof track?.ground === "boolean" ? track.ground : null;
      const verticalRate = parseCoord(track?.verticalRate ?? track?.verticalSpeed ?? track?.vs);
      return { lat, lon, time, speed, alt, onGround, verticalRate };
    })
    .filter(Boolean) as { lat: number; lon: number; time: number | null; speed: number | null; alt: number | null; onGround: boolean | null; verticalRate: number | null }[];
  const trackPoints = trackMetaPoints.map((p) => ({ lat: p.lat, lon: p.lon }));
  const maxTrackSpeed = trackMetaPoints.reduce<number | null>((max, point) => {
    if (point.speed == null || !Number.isFinite(point.speed)) return max;
    if (max == null) return point.speed;
    return point.speed > max ? point.speed : max;
  }, null);
  const maxTrackAlt = trackMetaPoints.reduce<number | null>((max, point) => {
    if (point.alt == null || !Number.isFinite(point.alt)) return max;
    if (max == null) return point.alt;
    return point.alt > max ? point.alt : max;
  }, null);
  const maxTrackFlightLevel = maxTrackAlt != null ? Math.floor(maxTrackAlt / 100) : null;
  const ruleMap = parseValidationRules(report.tourLeg.tour.validationRules ?? null);
  const getRule = (key: string) => ruleMap.get(key);
  const violations: Record<string, boolean> = {};
  const aircraftRule = getRule("aircraft");
  const callsignRule = getRule("callsign");
  const remarksRule = getRule("remarks");
  const flightRulesRule = getRule("flightRules");
  const maxSpeedRule = getRule("maxSpeed");
  const maxLevelRule = getRule("maxLevel");
  const militaryRule = getRule("military");

  const aircraftActual = (report.aircraft ?? getPlanValue(primaryPlan, ["aircraftId", "aircraft", "aircraftType"]))?.toString() ?? "";
  const aircraftList = normalizeRuleValue(aircraftRule?.value).split(/[,\s]+/).filter(Boolean);
  const aircraftOk = !aircraftRule?.value || (aircraftActual && aircraftList.some((item) => aircraftActual.toUpperCase().includes(item)));
  violations.aircraft = Boolean(aircraftRule?.value) && !aircraftOk;

  const callsignActual = report.callsign ?? session?.callsign ?? "";
  const callsignReq = normalizeRuleValue(callsignRule?.value);
  const callsignOk = !callsignReq || normalizeRuleValue(callsignActual).startsWith(callsignReq);
  violations.callsign = Boolean(callsignReq) && !callsignOk;

  const remarksActual = getPlanValue(primaryPlan, ["remarks", "rmk", "otherInfo", "otherInformation"]);
  const remarksReq = normalizeRuleValue(remarksRule?.value);
  const remarksOk = !remarksReq || normalizeRuleValue(remarksActual).includes(remarksReq);
  violations.remarks = Boolean(remarksReq) && !remarksOk;

  const flightRulesActual = parseFlightRules(getPlanValue(primaryPlan, ["flightRules", "rules", "flightRule"]));
  const flightRulesReq = normalizeRuleValue(flightRulesRule?.value);
  const flightRulesOk = !flightRulesReq || (flightRulesActual ?? "").startsWith(flightRulesReq);
  violations.flightRules = Boolean(flightRulesReq) && !flightRulesOk;

  const maxSpeedReq = parseNumeric(maxSpeedRule?.value);
  const planSpeedRaw = getPlanValue(primaryPlan, ["cruisingSpeed", "speed", "tas", "cruiseSpeed"]);
  const planSpeed = parseNumeric(planSpeedRaw);
  const maxSpeedObserved = maxTrackSpeed ?? planSpeed ?? null;
  const maxSpeedOk = maxSpeedReq == null || maxSpeedObserved == null || maxSpeedObserved <= maxSpeedReq;
  violations.maxSpeed = maxSpeedReq != null && maxSpeedObserved != null && !maxSpeedOk;

  const maxLevelReq = parseNumeric(maxLevelRule?.value);
  const planLevelRaw = getPlanValue(primaryPlan, ["cruisingLevel", "level", "altitude", "cruiseAltitude"]);
  const planLevelValue = parseNumeric(planLevelRaw);
  const planFlightLevel = planLevelValue != null && planLevelValue > 1000 ? Math.floor(planLevelValue / 100) : planLevelValue;
  const maxLevelObserved = maxTrackFlightLevel ?? planFlightLevel ?? null;
  const maxLevelOk = maxLevelReq == null || maxLevelObserved == null || maxLevelObserved <= maxLevelReq;
  violations.maxLevel = maxLevelReq != null && maxLevelObserved != null && !maxLevelOk;

  const militaryReq = normalizeRuleValue(militaryRule?.value);
  const militaryActual = session?.isMilitary;
  violations.military = militaryReq === "FORBIDDEN" && militaryActual === true;
  const dangerText = "text-[color:var(--danger)]";


  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Report detail</h1>
          <p className="text-xs text-[color:var(--text-muted)]">
            {report.user?.name ?? "Member"} ({report.user?.vid ?? "VID"}) - {report.tourLeg.tour.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/tours/reports`}
            className={buttonClassNames({ size: "sm", variant: "secondary" })}
          >
            Back to reports
          </Link>
          <Link
            href={`/${locale}/admin/tours/${report.tourLeg.tour.id}`}
            className={buttonClassNames({ size: "sm", variant: "secondary" })}
          >
            Open tour
          </Link>
        </div>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Flight details</h2>
        <div className="grid gap-2 text-sm text-[color:var(--text-muted)] md:grid-cols-2">
          <p><span className="font-semibold text-[color:var(--text-primary)]">Leg:</span> {report.tourLeg.legNumber} {report.tourLeg.departureCode} {"->"} {report.tourLeg.arrivalCode}</p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Callsign:</span>{" "}
            <span className={violations.callsign ? dangerText : ""}>{report.callsign ?? "-"}</span>
          </p>
          <p>
            <span className="font-semibold text-[color:var(--text-primary)]">Aircraft:</span>{" "}
            <span className={violations.aircraft ? dangerText : ""}>{report.aircraft ?? "-"}</span>
          </p>
          <p><span className="font-semibold text-[color:var(--text-primary)]">Route:</span> {report.route ?? "-"}</p>
          <p><span className="font-semibold text-[color:var(--text-primary)]">Flight date:</span> {report.flightDate ? new Date(report.flightDate).toLocaleString(locale) : "-"}</p>
          <p><span className="font-semibold text-[color:var(--text-primary)]">Online:</span> {report.online ? "Yes" : "No"}</p>
          <p><span className="font-semibold text-[color:var(--text-primary)]">Evidence URL:</span> {report.evidenceUrl ?? "-"}</p>
          <p><span className="font-semibold text-[color:var(--text-primary)]">Submitted:</span> {new Date(report.submittedAt).toLocaleString(locale)}</p>
        </div>
      </Card>

      {ruleMap.size > 0 ? (
        <Card className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Rule checks</h2>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            {aircraftRule?.value ? (
              <div className={violations.aircraft ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Aircraft types</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Required: {aircraftRule.value}</p>
                <p>Actual: {aircraftActual || "-"}</p>
              </div>
            ) : null}
            {callsignRule?.value ? (
              <div className={violations.callsign ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Callsign</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Required: {callsignRule.value}</p>
                <p>Actual: {callsignActual || "-"}</p>
              </div>
            ) : null}
            {remarksRule?.value ? (
              <div className={violations.remarks ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Remarks</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Required: {remarksRule.value}</p>
                <p>Actual: {remarksActual || "-"}</p>
              </div>
            ) : null}
            {flightRulesRule?.value ? (
              <div className={violations.flightRules ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Flight rules</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Required: {flightRulesRule.value}</p>
                <p>Actual: {flightRulesActual ?? "-"}</p>
              </div>
            ) : null}
            {maxSpeedRule?.value ? (
              <div className={violations.maxSpeed ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Max speed</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Limit: {maxSpeedRule.value} kts</p>
                <p>Observed: {maxSpeedObserved != null ? `${Math.round(maxSpeedObserved)} kts` : "-"}</p>
              </div>
            ) : null}
            {maxLevelRule?.value ? (
              <div className={violations.maxLevel ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Max level</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Limit: FL{maxLevelRule.value}</p>
                <p>Observed: {maxLevelObserved != null ? `FL${maxLevelObserved}` : "-"}</p>
              </div>
            ) : null}
            {militaryRule?.value ? (
              <div className={violations.military ? dangerText : "text-[color:var(--text-muted)]"}>
                <p className="text-xs uppercase tracking-[0.2em]">Military flight</p>
                <p className="font-semibold text-[color:var(--text-primary)]">Required: {militaryRule.value}</p>
                <p>Actual: {typeof militaryActual === "boolean" ? (militaryActual ? "Military" : "Civilian") : "-"}</p>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">IVAO session data</h2>
        {items.length == 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No sessions found for this callsign/VID.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Session ID</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.id ?? "-"}</p>
              </div>
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Server</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.serverId ?? "-"}</p>
              </div>
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Duration</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.time ? formatDuration(session.time) : "-"}</p>
              </div>
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Created</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.createdAt ?? "-"}</p>
              </div>
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Completed</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.completedAt ?? session?.updatedAt ?? "-"}</p>
              </div>
              <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 text-sm">
                <p className="text-xs text-[color:var(--text-muted)]">Software</p>
                <p className="font-semibold text-[color:var(--text-primary)]">{session?.softwareType?.name ?? session?.softwareTypeId ?? "-"}</p>
                <p className="text-xs text-[color:var(--text-muted)]">{session?.softwareVersion ?? ""}</p>
              </div>
            </div>

            {flightPlansCombined.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Flight plans</p>
                <div className="space-y-3">
                  {flightPlansCombined.map((plan: any, idx: number) => (
                    <div key={plan?.id ?? `${idx}`} className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Flight plan {idx + 1}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">Plan ID: {plan?.id ?? "-"}</p>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Aircraft</p>
                          <p className={`font-semibold ${violations.aircraft ? dangerText : "text-[color:var(--text-primary)]"}`}>{getPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"])}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">Wake: {getPlanValue(plan, ["wakeTurbulence", "wake", "wakeTurbulenceCategory"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Departure</p>
                          <p className="font-semibold text-[color:var(--text-primary)]">{getPlanValue(plan, ["departureId", "departure", "origin"])}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">Time: {getPlanDuration(plan, ["departureTime", "departTime", "time", "offBlockTime"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Arrival</p>
                          <p className="font-semibold text-[color:var(--text-primary)]">{getPlanValue(plan, ["arrivalId", "arrival", "destination"])}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">EET: {getPlanDuration(plan, ["enrouteTime", "ete", "eet"])}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Flight rules</p>
                          <p className={`font-semibold ${violations.flightRules ? dangerText : "text-[color:var(--text-primary)]"}`}>{getPlanValue(plan, ["flightRules", "rules", "flightRule"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Type</p>
                          <p className="font-semibold text-[color:var(--text-primary)]">{getPlanValue(plan, ["flightType", "type"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Alternate</p>
                          <p className="font-semibold text-[color:var(--text-primary)]">{getPlanValue(plan, ["alternateId", "alternate", "alternate1", "alternate2"])}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Cruise speed</p>
                          <p className={`font-semibold ${violations.maxSpeed ? dangerText : "text-[color:var(--text-primary)]"}`}>{getPlanValue(plan, ["cruisingSpeed", "speed", "tas", "cruiseSpeed"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Cruise level</p>
                          <p className={`font-semibold ${violations.maxLevel ? dangerText : "text-[color:var(--text-primary)]"}`}>{getPlanValue(plan, ["cruisingLevel", "level", "altitude", "cruiseAltitude"])}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-[color:var(--text-muted)]">Endurance</p>
                          <p className="font-semibold text-[color:var(--text-primary)]">{getPlanDuration(plan, ["endurance", "fuelEndurance"])}</p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-[color:var(--text-muted)]">Route</p>
                        <p className="text-sm text-[color:var(--text-primary)] whitespace-pre-wrap">{getPlanValue(plan, ["route", "routeString", "routeRaw", "routeText"])}</p>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="text-xs text-[color:var(--text-muted)]">Remarks / Other info</p>
                        <p className={`text-sm whitespace-pre-wrap ${violations.remarks ? dangerText : "text-[color:var(--text-primary)]"}`}>{getPlanValue(plan, ["remarks", "rmk", "otherInfo", "otherInformation"])}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">No flight plans returned.</p>
            )}

            {trackPoints.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Tracks</p>
                <p className="text-xs text-[color:var(--text-muted)]">Points: {trackPoints.length}</p>
                <TracksMap points={trackPoints} />
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">No track points returned.</p>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Review</h2>
        <form action={reviewTourLegReport} className="grid gap-2 md:grid-cols-[140px_1fr_auto]">
          <input type="hidden" name="reportId" value={report.id} />
          <input type="hidden" name="tourId" value={report.tourLeg.tour.id} />
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="redirectTo" value={`/${locale}/admin/tours/reports?status=pending`} />
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
      </Card>
    </main>
  );
}
