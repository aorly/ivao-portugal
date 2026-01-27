import { ivaoClient } from "@/lib/ivaoClient";
import { prisma } from "@/lib/prisma";

const formatUtc = (date: Date) => date.toISOString().slice(0, 19);

const pickPlanValue = (plan: Record<string, unknown> | null | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = plan?.[key];
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }
  return null;
};

const countBy = (values: Array<string | null | undefined>): { key: string; count: number } | null => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    if (!value) return;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  let top: { key: string; count: number } | null = null;
  counts.forEach((count, key) => {
    if (!top || count > top.count) top = { key, count };
  });
  return top;
};

const topByTime = (
  entries: Array<{ key: string | null; time: number | null | undefined }>,
): { key: string; time: number } | null => {
  const totals = new Map<string, number>();
  entries.forEach((entry) => {
    if (!entry.key) return;
    const time = typeof entry.time === "number" && Number.isFinite(entry.time) ? entry.time : 0;
    totals.set(entry.key, (totals.get(entry.key) ?? 0) + time);
  });
  let top: { key: string; time: number } | null = null;
  totals.forEach((time, key) => {
    if (!top || time > top.time) top = { key, time };
  });
  return top;
};

const toSessionTime = (value: unknown) => {
  const time = Number(value);
  return Number.isFinite(time) ? time : 0;
};

const monthRangeFromKey = (monthKey: string) => {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
  return { start, end };
};

export const recentMonthKeys = (count = 12) => {
  const now = new Date();
  return Array.from({ length: count }, (_, idx) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (idx + 1), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

export const syncMonthlyUserStatsForMonth = async (
  user: { id: string; vid: string },
  monthKey: string,
) => {
  const range = monthRangeFromKey(monthKey);
  if (!range) return;

  const pilotStatsRaw = await ivaoClient.getTrackerSessions({
    page: 1,
    perPage: 50,
    userId: user.vid,
    connectionType: "PILOT",
    from: formatUtc(range.start),
    to: formatUtc(range.end),
  });
  const atcStatsRaw = await ivaoClient.getTrackerSessions({
    page: 1,
    perPage: 50,
    userId: user.vid,
    connectionType: "ATC",
    from: formatUtc(range.start),
    to: formatUtc(range.end),
  });
  const pilotStatsItems = Array.isArray((pilotStatsRaw as { items?: unknown }).items)
    ? ((pilotStatsRaw as { items?: unknown }).items as Record<string, unknown>[])
    : [];
  const atcStatsItems = Array.isArray((atcStatsRaw as { items?: unknown }).items)
    ? ((atcStatsRaw as { items?: unknown }).items as Record<string, unknown>[])
    : [];
  const recentSessions = [...pilotStatsItems, ...atcStatsItems];

  const aircraftTime = new Map<string, number>();
  const aircraftCount = new Map<string, number>();
  const routeCount = new Map<string, number>();
  const airportCount = new Map<string, number>();
  const positionTime = new Map<string, number>();

  const pilotAircraft = pilotStatsItems.map((item) => {
    const plan = Array.isArray((item as { flightPlans?: unknown }).flightPlans)
      ? ((item as { flightPlans?: unknown }).flightPlans as Record<string, unknown>[])[0] ?? null
      : null;
    const aircraft = pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]);
    const time = toSessionTime((item as { time?: unknown }).time);
    if (aircraft) {
      aircraftTime.set(aircraft, (aircraftTime.get(aircraft) ?? 0) + time);
      aircraftCount.set(aircraft, (aircraftCount.get(aircraft) ?? 0) + 1);
    }
    const departure = pickPlanValue(plan, ["departureId", "departure", "origin"]);
    const arrival = pickPlanValue(plan, ["arrivalId", "arrival", "destination"]);
    if (departure) airportCount.set(departure, (airportCount.get(departure) ?? 0) + 1);
    if (arrival) airportCount.set(arrival, (airportCount.get(arrival) ?? 0) + 1);
    if (departure || arrival) {
      const route = `${departure ?? "----"}-${arrival ?? "----"}`;
      routeCount.set(route, (routeCount.get(route) ?? 0) + 1);
    }
    return aircraft;
  });
  const pilotAirports = pilotStatsItems.flatMap((item) => {
    const plan = Array.isArray((item as { flightPlans?: unknown }).flightPlans)
      ? ((item as { flightPlans?: unknown }).flightPlans as Record<string, unknown>[])[0] ?? null
      : null;
    const departure = pickPlanValue(plan, ["departureId", "departure", "origin"]);
    const arrival = pickPlanValue(plan, ["arrivalId", "arrival", "destination"]);
    return [departure, arrival].filter(Boolean) as string[];
  });
  const atcPositions = atcStatsItems.map((item) => ({
    key: typeof (item as { callsign?: unknown }).callsign === "string" ? String((item as { callsign?: unknown }).callsign) : null,
    time: Number((item as { time?: unknown }).time),
  }));
  atcStatsItems.forEach((item) => {
    const position = typeof (item as { callsign?: unknown }).callsign === "string" ? String((item as { callsign?: unknown }).callsign) : null;
    if (!position) return;
    const time = toSessionTime((item as { time?: unknown }).time);
    positionTime.set(position, (positionTime.get(position) ?? 0) + time);
  });

  const topAircraft = countBy(pilotAircraft);
  const topAirport = countBy(pilotAirports);
  const topPosition = topByTime(atcPositions);

  await prisma.monthlyUserStat.upsert({
    where: { userId_monthKey: { userId: user.id, monthKey } },
    create: {
      userId: user.id,
      userVid: user.vid,
      monthKey,
      monthStart: range.start,
      monthEnd: range.end,
      sessionsPilotCount: pilotStatsItems.length,
      sessionsAtcCount: atcStatsItems.length,
      sessionsTotalCount: recentSessions.length,
      topAircraft: topAircraft?.key ?? null,
      topAircraftCount: topAircraft?.count ?? 0,
      topAirport: topAirport?.key ?? null,
      topAirportCount: topAirport?.count ?? 0,
      topPosition: topPosition?.key ?? null,
      topPositionSeconds: topPosition?.time ?? 0,
    },
    update: {
      userVid: user.vid,
      monthStart: range.start,
      monthEnd: range.end,
      sessionsPilotCount: pilotStatsItems.length,
      sessionsAtcCount: atcStatsItems.length,
      sessionsTotalCount: recentSessions.length,
      topAircraft: topAircraft?.key ?? null,
      topAircraftCount: topAircraft?.count ?? 0,
      topAirport: topAirport?.key ?? null,
      topAirportCount: topAirport?.count ?? 0,
      topPosition: topPosition?.key ?? null,
      topPositionSeconds: topPosition?.time ?? 0,
    },
  });

  const detailRows: Array<{
    userId: string;
    userVid: string;
    monthKey: string;
    type: string;
    key: string;
    count: number;
    timeSeconds: number;
  }> = [];

  aircraftCount.forEach((count, key) => {
    detailRows.push({
      userId: user.id,
      userVid: user.vid,
      monthKey,
      type: "AIRCRAFT",
      key,
      count,
      timeSeconds: aircraftTime.get(key) ?? 0,
    });
  });
  routeCount.forEach((count, key) => {
    detailRows.push({
      userId: user.id,
      userVid: user.vid,
      monthKey,
      type: "ROUTE",
      key,
      count,
      timeSeconds: 0,
    });
  });
  airportCount.forEach((count, key) => {
    detailRows.push({
      userId: user.id,
      userVid: user.vid,
      monthKey,
      type: "AIRPORT",
      key,
      count,
      timeSeconds: 0,
    });
  });
  positionTime.forEach((timeSeconds, key) => {
    detailRows.push({
      userId: user.id,
      userVid: user.vid,
      monthKey,
      type: "POSITION",
      key,
      count: 0,
      timeSeconds,
    });
  });

  await prisma.monthlyUserStatDetail.deleteMany({
    where: { userId: user.id, monthKey },
  });
  if (detailRows.length > 0) {
    await prisma.monthlyUserStatDetail.createMany({ data: detailRows });
  }
};
