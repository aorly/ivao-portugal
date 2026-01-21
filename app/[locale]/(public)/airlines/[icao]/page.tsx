/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { type Locale } from "@/i18n";
import { SectionHeader } from "@/components/ui/section-header";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale; icao: string }>;
};

type SessionItem = {
  id?: string | number;
  callsign?: string;
  userId?: string | number;
  vid?: string | number;
  createdAt?: string;
  updatedAt?: string;
  departureId?: string;
  arrivalId?: string;
  aircraft?: string;
  flightPlan?: { departureId?: string; arrivalId?: string; aircraft?: string; aircraftType?: string };
  flightPlans?: { departureId?: string; arrivalId?: string; aircraftId?: string; aircraft?: string }[];
  dep?: string;
  arr?: string;
};

type LivePilot = {
  id?: number | string;
  callsign?: string;
  userId?: number | string;
  flightPlan?: {
    departureId?: string;
    arrivalId?: string;
    departure?: { icao?: string };
    arrival?: { icao?: string };
    aircraft?: { icaoCode?: string; model?: string };
  };
  lastTrack?: { groundSpeed?: number; altitude?: number; onGround?: boolean };
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const obj = value as { items?: unknown; data?: unknown; result?: unknown };
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.result)) return obj.result;
  }
  return [];
};

const pickString = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number") return String(candidate);
  }
  return "";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, icao } = await params;
  const t = await getTranslations({ locale, namespace: "airlines" });
  const title = `${icao.toUpperCase()} - ${t("title")}`;
  return {
    title,
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/airlines/${icao.toUpperCase()}`) },
  };
}

export default async function AirlineDetailPage({ params }: Props) {
  const { locale, icao } = await params;
  const t = await getTranslations({ locale, namespace: "airlines" });
  const code = icao.toUpperCase();

  const airline = await prisma.airline.findUnique({
    where: { icao: code },
  });

  const [sessionsRaw, liveRaw] = await Promise.all([
    ivaoClient.getTrackerSessions({ page: 1, callsign: code }).catch(() => ({ items: [] })),
    ivaoClient.getNowPilotsSummary().catch(() => []),
  ]);

  const sessionEntries = asArray(sessionsRaw)
    .map((item) => {
      const session = item as SessionItem;
      const callsign = pickString(session.callsign);
      const vid = pickString(session.userId, session.vid);
      const plan = Array.isArray(session.flightPlans)
        ? session.flightPlans.find((candidate) => candidate?.departureId || candidate?.arrivalId || candidate?.aircraftId) ??
          session.flightPlans[0]
        : undefined;
      const dep =
        pickString(session.departureId, session.flightPlan?.departureId, plan?.departureId, session.dep) || "-";
      const arr =
        pickString(session.arrivalId, session.flightPlan?.arrivalId, plan?.arrivalId, session.arr) || "-";
      const aircraft =
        pickString(session.aircraft, session.flightPlan?.aircraft, session.flightPlan?.aircraftType, plan?.aircraftId) || "-";
      const updatedAt = pickString(session.updatedAt, session.createdAt);
      return { id: session.id ?? callsign ?? `${vid}-${callsign}`, callsign, vid, dep, arr, aircraft, updatedAt };
    })
    .filter((entry) => entry.callsign && entry.callsign.toUpperCase().startsWith(code));

  const sessionMap = new Map<
    string,
    { id: string | number; callsign: string; vid: string; dep: string; arr: string; aircraft: string; updatedAt: string }
  >();
  sessionEntries.forEach((entry) => {
    const key = [
      entry.callsign.toUpperCase(),
      entry.dep.toUpperCase(),
      entry.arr.toUpperCase(),
      entry.aircraft.toUpperCase(),
    ].join("|");
    const existing = sessionMap.get(key);
    if (!existing) {
      sessionMap.set(key, entry);
      return;
    }
    const existingTime = Date.parse(existing.updatedAt);
    const nextTime = Date.parse(entry.updatedAt);
    if (!Number.isFinite(existingTime) || (Number.isFinite(nextTime) && nextTime > existingTime)) {
      sessionMap.set(key, entry);
    }
  });

  const sessionList = Array.from(sessionMap.values())
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 25);

  const livePilots = asArray(liveRaw)
    .map((item) => {
      const pilot = item as LivePilot;
      const callsign = pickString(pilot.callsign);
      const vid = pickString(pilot.userId);
      const dep =
        pickString(pilot.flightPlan?.departureId, pilot.flightPlan?.departure?.icao) || "-";
      const arr =
        pickString(pilot.flightPlan?.arrivalId, pilot.flightPlan?.arrival?.icao) || "-";
      const aircraft =
        pickString(pilot.flightPlan?.aircraft?.icaoCode, pilot.flightPlan?.aircraft?.model) || "-";
      const speed =
        typeof pilot.lastTrack?.groundSpeed === "number" ? Math.round(pilot.lastTrack.groundSpeed) : null;
      const altitude =
        typeof pilot.lastTrack?.altitude === "number" ? Math.round(pilot.lastTrack.altitude) : null;
      const onGround = pilot.lastTrack?.onGround ? "Ground" : "Airborne";
      return { id: pilot.id ?? callsign ?? `${vid}-${callsign}`, callsign, vid, dep, arr, aircraft, speed, altitude, onGround };
    })
    .filter((entry) => entry.callsign && entry.callsign.toUpperCase().startsWith(code))
    .slice(0, 25);

  return (
    <main className="flex flex-col gap-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeader eyebrow={t("title")} title={airline?.name ?? code} description={t("description")} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                {airline?.logoUrl || airline?.logoDarkUrl ? (
                  <>
                    <img src={airline.logoUrl || airline.logoDarkUrl || ""} alt="" className="logo-light h-10 w-10 object-contain" />
                    <img src={airline.logoDarkUrl || airline.logoUrl || ""} alt="" className="logo-dark h-10 w-10 object-contain" />
                  </>
                ) : (
                  <span className="text-[10px] text-[color:var(--text-muted)]">Logo</span>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{code}</p>
                <p className="text-lg font-semibold text-[color:var(--text-primary)]">{airline?.name ?? code}</p>
                {airline?.callsign ? (
                  <p className="text-sm text-[color:var(--text-muted)]">Callsign {airline.callsign}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Live pilots</p>
                {livePilots.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)]">No live pilots right now.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
                    <table className="min-w-[640px] w-full text-sm">
                      <thead className="bg-[color:var(--surface-2)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Callsign</th>
                          <th className="px-3 py-2 text-left">VID</th>
                          <th className="px-3 py-2 text-left">Route</th>
                          <th className="px-3 py-2 text-left">Aircraft</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--border)]">
                        {livePilots.map((pilot) => (
                          <tr key={pilot.id}>
                            <td className="px-3 py-2 font-mono text-xs">{pilot.callsign}</td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">{pilot.vid || "-"}</td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">
                              {pilot.dep} - {pilot.arr}
                            </td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">{pilot.aircraft}</td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">
                              {pilot.onGround}
                              {pilot.altitude != null ? ` | ${pilot.altitude} ft` : ""}
                              {pilot.speed != null ? ` | ${pilot.speed} kt` : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Recent flights</p>
                {sessionList.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)]">No recent flights found.</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)]">
                    <table className="min-w-[560px] w-full text-sm">
                      <thead className="bg-[color:var(--surface-2)] text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                        <tr>
                          <th className="px-3 py-2 text-left">Callsign</th>
                          <th className="px-3 py-2 text-left">VID</th>
                          <th className="px-3 py-2 text-left">Route</th>
                          <th className="px-3 py-2 text-left">Aircraft</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--border)]">
                        {sessionList.map((session) => (
                          <tr key={session.id}>
                            <td className="px-3 py-2 font-mono text-xs">{session.callsign}</td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">{session.vid || "-"}</td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">
                              {session.dep} - {session.arr}
                            </td>
                            <td className="px-3 py-2 text-[color:var(--text-muted)]">{session.aircraft}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Details</p>
              <div className="mt-3 space-y-2 text-sm text-[color:var(--text-muted)]">
                {airline?.description ? (
                  <p className="text-sm text-[color:var(--text-primary)]">{airline.description}</p>
                ) : null}
                <p>
                  <span className="text-[color:var(--text-primary)]">Website:</span>{" "}
                  {airline?.website ? (
                    <a className="text-[color:var(--primary)] underline" href={airline.website} target="_blank" rel="noreferrer">
                      {airline.website}
                    </a>
                  ) : (
                    "-"
                  )}
                </p>
                <p>
                  <span className="text-[color:var(--text-primary)]">CEO:</span>{" "}
                  {airline?.ceoName ? `${airline.ceoName} (${airline.ceoVid ?? "-"})` : "-"}
                </p>
                <p>
                  <span className="text-[color:var(--text-primary)]">Division:</span>{" "}
                  {airline?.countryId ?? "PT"}
                </p>
              </div>
            </div>
            <div className="rounded-3xl bg-[color:var(--surface-2)] p-5 text-sm text-[color:var(--text-muted)]">
              {t("description")}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
