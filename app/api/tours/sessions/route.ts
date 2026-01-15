import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";

const parseSessionDate = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const toIso = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toDate = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getRecordArray = (value: unknown) =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const pickPlanValue = (plan: Record<string, unknown> | null | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = plan?.[key];
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }
  return null;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.vid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = parseSessionDate(searchParams.get("date"));
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);

  const sessionsRaw = await ivaoClient.getTrackerSessions({
    userId: session.user.vid,
    connectionType: "PILOT",
    perPage: 50,
    page: 1,
  });
  const items = isRecord(sessionsRaw) ? getRecordArray(sessionsRaw.items) : [];
  const filtered = items.filter((item) => {
    const created = toDate(item.createdAt);
    const completed = toDate(item.completedAt ?? item.updatedAt) ?? created;
    if (!created || !completed) return false;
    return created < end && completed >= date;
  });

  const enriched = await Promise.all(
    filtered.map(async (item) => {
      const sessionId = typeof item.id === "string" || typeof item.id === "number" ? item.id : null;
      const planRaw = sessionId ? await ivaoClient.getTrackerSessionFlightPlans(sessionId).catch(() => []) : [];
      const planItems = Array.isArray(planRaw)
        ? planRaw
        : isRecord(planRaw)
          ? planRaw.items
          : [];
      const plans = getRecordArray(planItems);
      const flightPlans = getRecordArray(item.flightPlans);
      const plan = plans[0] ?? flightPlans[0] ?? null;
      const id = sessionId;
      const callsign = item.callsign;
      const isMilitary = item.isMilitary;
      return {
        id: typeof id === "string" || typeof id === "number" ? id : null,
        callsign: typeof callsign === "string" ? callsign : "",
        createdAt: toIso(item.createdAt),
        completedAt: toIso(item.completedAt ?? item.updatedAt),
        aircraft: pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]),
        departure: pickPlanValue(plan, ["departureId", "departure", "origin"]),
        arrival: pickPlanValue(plan, ["arrivalId", "arrival", "destination"]),
        route: pickPlanValue(plan, ["route", "routeString", "routeRaw", "routeText"]),
        flightRules: pickPlanValue(plan, ["flightRules", "rules", "flightRule"]),
        remarks: pickPlanValue(plan, ["remarks", "rmk", "otherInfo", "otherInformation"]),
        cruiseSpeed: pickPlanValue(plan, ["cruisingSpeed", "speed", "tas", "cruiseSpeed"]),
        cruiseLevel: pickPlanValue(plan, ["cruisingLevel", "level", "altitude", "cruiseAltitude"]),
        isMilitary: typeof isMilitary === "boolean" ? isMilitary : null,
      };
    }),
  );

  return NextResponse.json({ items: enriched });
}
