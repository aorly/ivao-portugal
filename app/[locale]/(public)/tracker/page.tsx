import Link from "next/link";
import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ page?: string; perPage?: string; vid?: string }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const obj = value as { data?: unknown; result?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.result)) return obj.result as Record<string, unknown>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  }
  return [];
};

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

const formatDuration = (seconds: number | null) => {
  if (!seconds || !Number.isFinite(seconds)) return "0m";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const toDateOrNull = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default async function TrackerPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const session = await auth();
  const vid = sp.vid ? String(sp.vid).trim() : session?.user?.vid ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const perPage = Math.min(20, Math.max(5, Number.parseInt(sp.perPage ?? "5", 10) || 5));
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/tracker`)}`;

  if (!vid) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <Card className="space-y-3 p-4">
          <p className="text-sm text-[color:var(--text-muted)]">
            Login to see your tracker sessions or search by VID.
          </p>
          <Link href={loginUrl}>
            <Button>Login</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const raw = await ivaoClient.getTrackerSessions({ page, perPage, userId: vid });
  const items = asArray(raw);
  const meta = isRecord(raw) ? raw : {};
  const totalItems = Number(meta.totalItems ?? 0);
  const totalPages = Number(meta.pages ?? Math.max(1, Math.ceil((totalItems || 0) / perPage)));
  const sessions = items.map((item) => {
    const plan = asArray((item as { flightPlans?: unknown }).flightPlans)[0] ?? null;
    const departure = pickPlanValue(plan, ["departureId", "departure", "origin"]);
    const arrival = pickPlanValue(plan, ["arrivalId", "arrival", "destination"]);
    const aircraft = pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]);
    const callsign = pickString((item as { callsign?: unknown }).callsign) ?? "UNKNOWN";
    const connectionType = pickString((item as { connectionType?: unknown }).connectionType) ?? "SESSION";
    const timeSeconds = Number((item as { time?: unknown }).time);
    const createdAtRaw = pickString((item as { createdAt?: unknown }).createdAt);
    const completedAtRaw = pickString(
      (item as { completedAt?: unknown }).completedAt,
      (item as { updatedAt?: unknown }).updatedAt,
    );
    const createdAt = toDateOrNull(createdAtRaw);
    const completedAt = toDateOrNull(completedAtRaw);
    const startLabel = createdAt ? createdAt.toUTCString().slice(5, 22) : "Unknown";
    const endLabel = completedAt ? completedAt.toUTCString().slice(5, 22) : null;
    return {
      id: pickString((item as { id?: unknown }).id, callsign, createdAtRaw) ?? callsign,
      callsign,
      connectionType,
      duration: formatDuration(Number.isFinite(timeSeconds) ? timeSeconds : null),
      route: departure || arrival ? `${departure ?? "----"} -> ${arrival ?? "----"}` : null,
      aircraft,
      startLabel,
      endLabel,
    };
  });

  const queryBase = `vid=${encodeURIComponent(vid)}&perPage=${perPage}`;
  const prevHref = page > 1 ? `/${locale}/tracker?${queryBase}&page=${page - 1}` : null;
  const nextHref = page < totalPages ? `/${locale}/tracker?${queryBase}&page=${page + 1}` : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Tracker</p>
          <p className="text-lg font-semibold text-[color:var(--text-primary)]">Recent sessions</p>
        </div>
        <form action={`/${locale}/tracker`} className="flex items-center gap-2">
          <input
            name="vid"
            defaultValue={vid}
            placeholder="VID"
            className="w-28 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
          />
          <Button size="sm" variant="secondary" type="submit">
            View
          </Button>
        </form>
      </div>

      <Card className="space-y-3 p-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No sessions found.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((sessionItem) => (
              <Link
                key={sessionItem.id}
                href={`/${locale}/tracker/${encodeURIComponent(sessionItem.id)}`}
                className="space-y-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 transition hover:border-[color:var(--primary)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{sessionItem.callsign}</p>
                  <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    {sessionItem.connectionType}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--text-muted)]">
                  <span>{sessionItem.route ?? "Route unavailable"}</span>
                  <span>{sessionItem.aircraft ?? "Aircraft unknown"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[color:var(--text-muted)]">
                  <span>
                    {sessionItem.startLabel}
                    {sessionItem.endLabel ? ` - ${sessionItem.endLabel}` : ""}
                  </span>
                  <span className="font-semibold text-[color:var(--text-primary)]">{sessionItem.duration}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
        <span>
          Page {page} of {Math.max(1, totalPages || 1)}
        </span>
        <div className="flex items-center gap-2">
          {prevHref ? (
            <Link href={prevHref} className="rounded-md border border-[color:var(--border)] px-2 py-1">
              Prev
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-2 py-1 text-[color:var(--text-muted)]">
              Prev
            </span>
          )}
          {nextHref ? (
            <Link href={nextHref} className="rounded-md border border-[color:var(--border)] px-2 py-1">
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-2 py-1 text-[color:var(--text-muted)]">
              Next
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
