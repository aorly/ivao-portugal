"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { type Locale } from "@/i18n";
import { ivaoClient } from "@/lib/ivaoClient";

const toDate = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseFlightTime = (value: unknown) => {
  if (typeof value === "number") {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const parseSessionTime = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeFlights = (raw: unknown) => {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const candidates = [
    obj.flights,
    obj.data,
    (obj.clients as any)?.pilots,
    obj.pilots,
  ];
  const list = candidates.find(Array.isArray);
  return Array.isArray(list) ? list : [];
};

const toText = (value: unknown) => (value == null ? "" : String(value).trim());

const extractVid = (flight: any) =>
  toText(
    flight?.userId ??
      flight?.pilotId ??
      flight?.vid ??
      flight?.pilot?.vid ??
      flight?.pilot?.id ??
      flight?.pilot?.userId ??
      flight?.id,
  );

const extractFlight = (flight: any) => {
  const dep =
    toText(
      flight?.flightPlan?.departureId ??
        flight?.flight_plan?.departureId ??
        flight?.departure ??
        flight?.dep ??
        flight?.origin ??
        flight?.from,
    ).toUpperCase() || null;
  const arr =
    toText(
      flight?.flightPlan?.arrivalId ??
        flight?.flight_plan?.arrivalId ??
        flight?.arrival ??
        flight?.arr ??
        flight?.destination ??
        flight?.to,
    ).toUpperCase() || null;
  const callsign = toText(flight?.callsign).toUpperCase() || null;
  const vid = extractVid(flight);
  const timestamp =
    parseFlightTime(flight?.lastTrack?.timestamp) ??
    parseFlightTime(flight?.lastTrack?.time) ??
    parseFlightTime(flight?.logonTime) ??
    parseFlightTime(flight?.time) ??
    null;
  return { dep, arr, callsign, vid, timestamp };
};

const parseValidationRules = (value: string | null) => {
  if (!value) return [] as { key: string; value?: string | null; public?: boolean; publicLabel?: string | null }[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return [];
};

const parseNumber = (value: unknown) => {
  if (value == null) return null;
  const match = String(value).match(/[\d.]+/);
  if (!match) return null;
  const num = Number.parseFloat(match[0]);
  return Number.isFinite(num) ? num : null;
};

const parseLevel = (value: unknown) => {
  if (value == null) return null;
  const raw = String(value).toUpperCase();
  if (raw.startsWith("FL")) {
    const num = parseNumber(raw.slice(2));
    return num != null ? num : null;
  }
  return parseNumber(raw);
};

const normalizeSessions = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  return Array.isArray(obj.items) ? (obj.items as any[]) : [];
};

const extractSession = (session: any) => {
  const callsign = toText(session?.callsign).toUpperCase() || null;
  const userId = toText(session?.userId ?? session?.user?.id ?? session?.id);
  const createdAt = parseSessionTime(session?.createdAt);
  const completedAt = parseSessionTime(session?.completedAt) ?? parseSessionTime(session?.updatedAt);
  const flightPlans = Array.isArray(session?.flightPlans) ? session.flightPlans : null;
  return { callsign, userId, createdAt, completedAt, flightPlans, raw: session };
};

const sessionMatchesLeg = (session: ReturnType<typeof extractSession>, dep: string, arr: string) => {
  if (!session.flightPlans) return false;
  return session.flightPlans.some(
    (fp: any) =>
      toText(fp?.departureId).toUpperCase() === dep && toText(fp?.arrivalId).toUpperCase() === arr,
  );
};

export async function joinTour(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tourId = String(formData.get("tourId") ?? "");
  const locale = String(formData.get("locale") ?? "en") as Locale;
  const slug = String(formData.get("slug") ?? "");
  if (!tourId) throw new Error("Invalid tour");

  const before = await prisma.tourEnrollment.findUnique({
    where: { userId_tourId: { userId: session.user.id, tourId } },
  });
  const enrollment = await prisma.tourEnrollment.upsert({
    where: { userId_tourId: { userId: session.user.id, tourId } },
    update: {},
    create: {
      userId: session.user.id,
      tourId,
      acceptedAt: new Date(),
      status: "ACTIVE",
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: before ? "update" : "create",
    entityType: "tourEnrollment",
    entityId: enrollment.id,
    before,
    after: enrollment,
  });

  revalidatePath(`/${locale}/tours`);
  if (slug) revalidatePath(`/${locale}/tours/${slug}`);
  if (slug) {
    redirect(`/${locale}/tours/${slug}`);
  }
}

export async function submitTourLegReport(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const legId = String(formData.get("legId") ?? "");
  const locale = String(formData.get("locale") ?? "en") as Locale;
  const slug = String(formData.get("slug") ?? "");
  if (!legId) throw new Error("Invalid leg");

  const leg = await prisma.tourLeg.findUnique({
    where: { id: legId },
    select: { id: true, tourId: true, departureCode: true, arrivalCode: true },
  });
  if (!leg) throw new Error("Leg not found");

  const tour = await prisma.tour.findUnique({
    where: { id: leg.tourId },
    select: { validationRules: true, allowAnyAircraft: true, slug: true },
  });

  const enrollment = await prisma.tourEnrollment.findUnique({
    where: { userId_tourId: { userId: session.user.id, tourId: leg.tourId } },
  });
  if (!enrollment) throw new Error("Tour not started");

  const flightDate = toDate(formData.get("flightDate"));
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const callsign = String(formData.get("callsign") ?? "").trim() || null;
  const aircraft = String(formData.get("aircraft") ?? "").trim() || null;
  const route = String(formData.get("route") ?? "").trim() || null;
  const online = formData.get("online") === "on";
  const evidenceUrl = String(formData.get("evidenceUrl") ?? "").trim() || null;

  const userVid = toText(session.user.vid ?? "").trim();

  let status = "PENDING";
  let reviewNote: string | null = null;
  let reviewedAt: Date | null = null;

  if (!callsign) {
    reviewNote = "Auto-validation failed: callsign is required for strict IVAO matching.";
  } else if (!userVid) {
    reviewNote = "Auto-validation failed: user VID unavailable for matching.";
  } else if (!flightDate) {
    reviewNote = "Auto-validation failed: flight date is required.";
  } else if (!online) {
    reviewNote = "Auto-validation failed: flight must be marked online.";
  } else {
    const dep = leg.departureCode;
    const arr = leg.arrivalCode;
    let matchedBy: "sessions" | "live" | null = null;
    let matchedSession: any = null;
    let matchedPlans: any[] = [];

    if (sessionId) {
      const plansRaw = await ivaoClient.getTrackerSessionFlightPlans(sessionId);
      const plans = Array.isArray(plansRaw) ? plansRaw : Array.isArray((plansRaw as any)?.items) ? (plansRaw as any).items : [];
      matchedPlans = plans;
      const hasPlanMatch = plans.some(
        (fp: any) => toText(fp?.departureId).toUpperCase() === dep && toText(fp?.arrivalId).toUpperCase() === arr,
      );
      if (hasPlanMatch) {
        matchedBy = "sessions";
        matchedSession = { id: sessionId };
      }
    }

    if (!matchedBy) {
      const sessionsRaw = await ivaoClient.getTrackerSessions({
        userId: userVid,
        callsign: callsign.toUpperCase(),
        connectionType: "PILOT",
        perPage: 25,
        page: 1,
      });
      const sessions = normalizeSessions(sessionsRaw).map(extractSession);
      const sessionMatch = sessions.find((session) => {
        if (session.callsign !== callsign.toUpperCase() || session.userId !== userVid) return false;
        if (session.createdAt && session.completedAt) {
          if (flightDate < session.createdAt || flightDate > session.completedAt) return false;
        }
        if (session.flightPlans) {
          return sessionMatchesLeg(session, dep, arr);
        }
        return true;
      });

      if (sessionMatch) {
        let hasPlanMatch = sessionMatch.flightPlans ? sessionMatchesLeg(sessionMatch, dep, arr) : false;
        if (!hasPlanMatch) {
          const plansRaw = await ivaoClient.getTrackerSessionFlightPlans(sessionMatch.raw?.id ?? "");
          const plans = Array.isArray(plansRaw) ? plansRaw : Array.isArray((plansRaw as any)?.items) ? (plansRaw as any).items : [];
          hasPlanMatch = plans.some(
            (fp: any) => toText(fp?.departureId).toUpperCase() === dep && toText(fp?.arrivalId).toUpperCase() === arr,
          );
          matchedPlans = plans;
        } else if (Array.isArray(sessionMatch.flightPlans)) {
          matchedPlans = sessionMatch.flightPlans;
        }
        if (hasPlanMatch) {
          matchedBy = "sessions";
          matchedSession = sessionMatch.raw ?? sessionMatch;
        }
      }
    }

    if (!matchedBy) {
      const flightsRaw = await ivaoClient.getFlights().catch(() => []);
      const flights = normalizeFlights(flightsRaw).map(extractFlight);
      const liveMatch = flights.find(
        (f) =>
          f.callsign === callsign.toUpperCase() &&
          f.vid === userVid &&
          f.dep === leg.departureCode &&
          f.arr === leg.arrivalCode,
      );
      if (liveMatch) {
        matchedBy = "live";
      }
    }

    if (matchedBy) {
      const rules = parseValidationRules(tour?.validationRules ?? null);
      const ruleFailures: string[] = [];

      const plan = matchedPlans.length ? matchedPlans[0] : null;
      const planAircraft = toText(plan?.aircraftId ?? plan?.aircraft ?? plan?.aircraftType).toUpperCase();
      const planSpeed = parseNumber(plan?.cruisingSpeed ?? plan?.speed ?? plan?.tas ?? plan?.cruiseSpeed);
      const planLevel = parseLevel(plan?.cruisingLevel ?? plan?.level ?? plan?.altitude ?? plan?.cruiseAltitude);
      const planRemarks = toText(plan?.remarks ?? plan?.rmk ?? plan?.otherInfo ?? plan?.otherInformation).toUpperCase();
      const planRules = toText(plan?.flightRules ?? plan?.rules ?? plan?.flightRule).toUpperCase();
      const planMilitary =
        typeof plan?.isMilitary === "boolean"
          ? plan.isMilitary
          : typeof matchedSession?.isMilitary === "boolean"
            ? matchedSession.isMilitary
            : false;

      rules.forEach((rule) => {
        if (!rule?.key) return;
        const value = toText(rule.value ?? "");
        switch (rule.key) {
          case "aircraft": {
            if (tour?.allowAnyAircraft || !value) break;
            const allowed = value
              .split(/[;, ]+/)
              .map((v) => v.trim().toUpperCase())
              .filter(Boolean);
            if (allowed.length && (!planAircraft || !allowed.includes(planAircraft))) {
              ruleFailures.push(`Aircraft not allowed (${planAircraft || "unknown"})`);
            }
            break;
          }
          case "maxSpeed": {
            const max = parseNumber(value);
            if (max != null && planSpeed != null && planSpeed > max) {
              ruleFailures.push(`Speed ${planSpeed} exceeds ${max}`);
            }
            break;
          }
          case "maxLevel": {
            const max = parseLevel(value);
            if (max != null && planLevel != null && planLevel > max) {
              ruleFailures.push(`Level ${planLevel} exceeds ${max}`);
            }
            break;
          }
          case "callsign": {
            if (value && !callsign.toUpperCase().startsWith(value.toUpperCase())) {
              ruleFailures.push("Callsign does not match required prefix");
            }
            break;
          }
          case "remarks": {
            if (value && !planRemarks.includes(value.toUpperCase())) {
              ruleFailures.push("Mandatory remark missing");
            }
            break;
          }
          case "flightRules": {
            if (value && planRules) {
              const allowed = value
                .split(/[;, ]+/)
                .map((v) => v.trim().toUpperCase())
                .filter(Boolean);
              if (allowed.length && !allowed.includes(planRules)) {
                ruleFailures.push(`Flight rules ${planRules} not allowed`);
              }
            }
            break;
          }
          case "military": {
            if (value === "forbidden" && planMilitary) {
              ruleFailures.push("Military flights are not allowed");
            }
            break;
          }
          default:
            break;
        }
      });

      if (ruleFailures.length) {
        status = "PENDING";
        reviewNote = `Auto-validation failed: ${ruleFailures.join("; ")}`;
      } else {
        status = "APPROVED";
        reviewNote = matchedBy === "sessions" ? "Auto-approved: matched IVAO session." : "Auto-approved: matched IVAO live flight.";
        reviewedAt = new Date();
      }
    } else {
      reviewNote = "Auto-validation failed: no matching IVAO session or live flight found.";
    }
  }

  const before = await prisma.tourLegReport.findUnique({
    where: { userId_tourLegId: { userId: session.user.id, tourLegId: leg.id } },
  });
  const report = await prisma.tourLegReport.upsert({
    where: { userId_tourLegId: { userId: session.user.id, tourLegId: leg.id } },
    update: {
      status,
      submittedAt: new Date(),
      reviewedAt,
      reviewedById: status === "APPROVED" ? null : null,
      reviewNote,
      flightDate,
      callsign,
      aircraft,
      route,
      online,
      evidenceUrl,
    },
    create: {
      userId: session.user.id,
      tourLegId: leg.id,
      status,
      submittedAt: new Date(),
      reviewedAt,
      reviewNote,
      flightDate,
      callsign,
      aircraft,
      route,
      online,
      evidenceUrl,
    },
  });

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: before ? "update" : "create",
    entityType: "tourLegReport",
    entityId: report.id,
    before,
    after: report,
  });

  const redirectSlug = tour?.slug ?? slug;
  revalidatePath(`/${locale}/tours`);
  if (redirectSlug) revalidatePath(`/${locale}/tours/${redirectSlug}`);
  if (redirectSlug) {
    redirect(`/${locale}/tours/${redirectSlug}`);
  }
}
