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

const pickPlanValue = (plan: any, keys: string[]) => {
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
  const items = Array.isArray((sessionsRaw as any)?.items) ? (sessionsRaw as any).items : [];
  const filtered = items.filter((item: any) => {
    const created = item?.createdAt ? new Date(item.createdAt) : null;
    const completed = item?.completedAt
      ? new Date(item.completedAt)
      : item?.updatedAt
        ? new Date(item.updatedAt)
        : created;
    if (!created || !completed) return false;
    return created < end && completed >= date;
  });

  const enriched = await Promise.all(
    filtered.map(async (item: any) => {
      const planRaw = await ivaoClient.getTrackerSessionFlightPlans(item.id).catch(() => []);
      const plans = Array.isArray(planRaw)
        ? planRaw
        : Array.isArray((planRaw as any)?.items)
          ? (planRaw as any).items
          : [];
      const plan =
        plans[0] ?? (Array.isArray(item?.flightPlans) ? item.flightPlans[0] : null);
      return {
        id: item.id,
        callsign: item.callsign ?? "",
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
        isMilitary: item.isMilitary ?? null,
      };
    }),
  );

  return NextResponse.json({ items: enriched });
}
