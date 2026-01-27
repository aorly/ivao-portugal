import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrackerSessionMap } from "@/components/public/tracker-session-map";
import { TrackerSessionChart } from "@/components/public/tracker-session-chart";
import { ivaoClient } from "@/lib/ivaoClient";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pickString = (...candidates: unknown[]): string | undefined => {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
    if (typeof c === "number") return String(c);
  }
  return undefined;
};

const pickPlanValue = (plan: Record<string, unknown> | null | undefined, keys: string[]) => {
  for (const key of keys) {
    const value = plan?.[key];
    if (value === undefined || value === null || value === "") continue;
    return String(value);
  }
  return null;
};

const toNumber = (value: unknown) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toTimestamp = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type SampledTrack = {
  timestamp: Date | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  groundSpeed: number | null;
};

const sampleTracks = (tracks: SampledTrack[], maxPoints = 100) => {
  const filtered = tracks.filter((track) => track.timestamp && track.latitude !== null && track.longitude !== null);
  if (filtered.length === 0) return [];
  const step = Math.max(1, Math.ceil(filtered.length / maxPoints));
  return filtered.filter((_, index) => index % step === 0);
};

const fetchTerrainElevations = async (points: Array<{ latitude: number; longitude: number }>) => {
  if (points.length === 0) return [];
  const latitudes = points.map((point) => point.latitude.toFixed(5)).join(",");
  const longitudes = points.map((point) => point.longitude.toFixed(5)).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`;
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { elevation?: number[] };
    const elevations = Array.isArray(data.elevation) ? data.elevation : [];
    return elevations.map((value) => (Number.isFinite(value) ? value * 3.28084 : null));
  } catch {
    return [];
  }
};

const formatRange = (min: number, max: number, unit: string) =>
  min === 0 && max === 0 ? "-" : `${Math.round(min)}-${Math.round(max)} ${unit}`;

export default async function TrackerSessionPage({ params }: Props) {
  const { locale, id } = await params;
  const [sessionRaw, plansRaw, tracksRaw] = await Promise.all([
    ivaoClient.getTrackerSession(id),
    ivaoClient.getTrackerSessionFlightPlans(id),
    ivaoClient.getTrackerSessionTracks(id),
  ]);
  const session = isRecord(sessionRaw) ? sessionRaw : null;
  const plans = asArray(plansRaw);
  const tracks = asArray(tracksRaw)
    .map((entry, index) => ({
      id: `${String((entry as { timestamp?: unknown }).timestamp ?? "track")}-${index}`,
      timestamp: toTimestamp((entry as { timestamp?: unknown }).timestamp),
      latitude: toNumber((entry as { latitude?: unknown }).latitude),
      longitude: toNumber((entry as { longitude?: unknown }).longitude),
      altitude: toNumber((entry as { altitude?: unknown }).altitude),
      groundSpeed: toNumber((entry as { groundSpeed?: unknown }).groundSpeed),
      heading: toNumber((entry as { heading?: unknown }).heading),
      onGround: Boolean((entry as { onGround?: unknown }).onGround),
      state: typeof (entry as { state?: unknown }).state === "string" ? (entry as { state?: unknown }).state : "",
    }))
    .filter((entry) => entry.timestamp);

  const callsign = pickString(session?.callsign) ?? "UNKNOWN";
  const timeSeconds = Number((session?.time as unknown) ?? 0);
  const duration = timeSeconds ? `${Math.round(timeSeconds / 60)}m` : "-";
  const createdAt = toTimestamp(session?.createdAt ?? null);
  const completedAt = toTimestamp(session?.completedAt ?? session?.updatedAt ?? null);
  const startLabel = createdAt ? createdAt.toUTCString().slice(5, 22) : "-";
  const endLabel = completedAt ? completedAt.toUTCString().slice(5, 22) : "-";
  const flightPlans = (session?.flightPlans && Array.isArray(session.flightPlans) ? session.flightPlans : plans).map(
    (plan) => ({
      id: pickString((plan as { id?: unknown }).id) ?? "plan",
      departure: pickPlanValue(plan, ["departureId", "departure", "origin"]),
      arrival: pickPlanValue(plan, ["arrivalId", "arrival", "destination"]),
      aircraft: pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]),
      route: pickPlanValue(plan, ["route", "routeString", "routeText"]),
    }),
  );
  const mapPoints = tracks.map((track) => ({
    lat: track.latitude ?? 0,
    lon: track.longitude ?? 0,
    alt: track.altitude ?? null,
    onGround: track.onGround ?? false,
    timestamp: track.timestamp ? track.timestamp.toISOString() : null,
  }));
  const sampledTracks = sampleTracks(
    tracks.map((track) => ({
      timestamp: track.timestamp ?? null,
      latitude: track.latitude ?? null,
      longitude: track.longitude ?? null,
      altitude: track.altitude ?? null,
      groundSpeed: track.groundSpeed ?? null,
    })),
  );
  const labels = sampledTracks.map((track) =>
    track.timestamp ? track.timestamp.toISOString().slice(11, 16) : "--:--",
  );
  const altitudeValues = sampledTracks.map((track) => (track.altitude !== null ? track.altitude : null));
  const groundSpeedValues = sampledTracks.map((track) => (track.groundSpeed !== null ? track.groundSpeed : null));
  const altitudeMax = Math.max(
    ...altitudeValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    0,
  );
  const altitudeInFeet =
    altitudeMax > 0 && altitudeMax < 20000
      ? altitudeValues.map((value) => (value === null ? null : Math.round(value * 3.28084)))
      : altitudeValues;
  const terrainElevations = await fetchTerrainElevations(
    sampledTracks
      .filter((track) => track.latitude !== null && track.longitude !== null)
      .map((track) => ({ latitude: track.latitude as number, longitude: track.longitude as number })),
  );
  const terrainValues = sampledTracks.map((_, index) =>
    typeof terrainElevations[index] === "number" ? (terrainElevations[index] as number) : null,
  );
  const smoothSeries = (values: Array<number | null>, windowSize = 5) => {
    if (values.length === 0) return values;
    return values.map((value, index) => {
      if (value === null) return null;
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(values.length, index + Math.ceil(windowSize / 2));
      const window = values.slice(start, end).filter((item): item is number => typeof item === "number");
      if (window.length === 0) return value;
      const avg = window.reduce((sum, item) => sum + item, 0) / window.length;
      return Math.round(avg);
    });
  };
  const smoothedTerrain = smoothSeries(terrainValues, 5);

  const movingIndexes = sampledTracks
    .map((track, index) => ({ index, gs: groundSpeedValues[index], time: track.timestamp }))
    .filter((item) => (item.gs ?? 0) > 0 && item.time);
  let trimStart = 0;
  let trimEnd = sampledTracks.length;
  if (movingIndexes.length > 0) {
    const firstMove = movingIndexes[0].time as Date;
    const lastMove = movingIndexes[movingIndexes.length - 1].time as Date;
    const startWindow = new Date(firstMove.getTime() - 3 * 60 * 1000);
    const endWindow = new Date(lastMove.getTime() + 3 * 60 * 1000);
    trimStart = sampledTracks.findIndex((track) => track.timestamp && track.timestamp >= startWindow);
    trimStart = trimStart >= 0 ? trimStart : 0;
    const endIndex = sampledTracks.findIndex((track) => track.timestamp && track.timestamp > endWindow);
    trimEnd = endIndex >= 0 ? endIndex : sampledTracks.length;
  }

  const trimmedLabels = labels.slice(trimStart, trimEnd);
  const trimmedAltitude = altitudeInFeet.slice(trimStart, trimEnd);
  const trimmedGroundSpeed = groundSpeedValues.slice(trimStart, trimEnd);
  const trimmedTerrain = smoothedTerrain.slice(trimStart, trimEnd);
  const altitudeRange = {
    min: Math.min(...altitudeValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value)), 0),
    max: Math.max(...altitudeValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value)), 0),
  };
  const groundSpeedRange = {
    min: Math.min(
      ...groundSpeedValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
      0,
    ),
    max: Math.max(
      ...groundSpeedValues.filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
      0,
    ),
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Tracker</p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">Session {id}</p>
        </div>
        <Link href={`/${locale}/tracker`}>
          <Button size="sm" variant="secondary">
            Back to tracker
          </Button>
        </Link>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Callsign</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{callsign}</p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Start</p>
            <p className="text-sm text-[color:var(--text-primary)]">{startLabel}</p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">End</p>
            <p className="text-sm text-[color:var(--text-primary)]">{endLabel}</p>
          </div>
          <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Duration</p>
            <p className="text-sm text-[color:var(--text-primary)]">{duration}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Flight track</p>
        <TrackerSessionMap points={mapPoints} />
      </Card>

      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              Altitude, ground speed, and terrain
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">Sampled from {sampledTracks.length} points.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Alt {formatRange(altitudeRange.min, altitudeRange.max, "ft")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              GS {formatRange(groundSpeedRange.min, groundSpeedRange.max, "kt")}
            </span>
          </div>
        </div>
        {sampledTracks.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No altitude or ground speed data available.</p>
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
            <TrackerSessionChart
              labels={trimmedLabels}
              altitude={trimmedAltitude}
              groundSpeed={trimmedGroundSpeed}
              terrain={trimmedTerrain}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] px-4 py-3 text-xs text-[color:var(--text-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Altitude (ft)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                Ground speed (kt)
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Terrain (ft)
              </div>
              <span>Times shown in UTC</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Flight plans</p>
        {flightPlans.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No flight plans found.</p>
        ) : (
          <div className="space-y-2">
            {flightPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
              >
                <p className="font-semibold text-[color:var(--text-primary)]">
                  {plan.departure ?? "----"} &rarr; {plan.arrival ?? "----"}
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {plan.aircraft ?? "Aircraft unknown"} {plan.route ? `| ${plan.route}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Tracks</p>
          <span className="text-xs text-[color:var(--text-muted)]">{tracks.length}</span>
        </div>
        {tracks.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No tracks found for this session.</p>
        ) : (
          <div className="max-h-72 overflow-x-auto rounded-lg border border-[color:var(--border)]">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.7fr] gap-2 bg-[color:var(--surface-2)] px-2 py-2 text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                <span>Timestamp (UTC)</span>
                <span>Lat</span>
                <span>Lon</span>
                <span>Alt</span>
                <span>GS</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-[color:var(--border)]">
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr_0.7fr] gap-2 px-2 py-2 text-xs text-[color:var(--text-primary)]"
                  >
                    <span className="text-[11px] text-[color:var(--text-muted)]">
                      {track.timestamp ? track.timestamp.toUTCString().slice(5, 22) : "-"}
                    </span>
                    <span>{track.latitude ?? "-"}</span>
                    <span>{track.longitude ?? "-"}</span>
                    <span>{track.altitude ?? "-"}</span>
                    <span>{track.groundSpeed ?? "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
