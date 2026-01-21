import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Navbar } from "@/components/navigation/navbar";
import { ProfileEventsCarousel } from "@/components/profile-events-carousel";
import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { getMenu } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { type StaffPermission, getStaffPermissions } from "@/lib/staff";
import { type Locale } from "@/i18n";
import {
  deleteAtcBookingAction,
  deleteCreatorBannerAction,
  updateCreatorBannerAction,
  updateStaffProfileAction,
  updateCeoAirlineLogoAction,
} from "./actions";
import { unstable_cache } from "next/cache";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ vid?: string }>;
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: "profile" });
  const th = await getTranslations({ locale, namespace: "home" });
  const session = await auth();
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/profile`)}`;
  const requestedVid = sp.vid ? String(sp.vid).trim() : "";

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  const formatDateTimeLocal = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);

  if (!session?.user) {
    return (
      <main className="flex flex-col gap-6">
        <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
        <Card className="space-y-4 p-4">
          <p className="text-sm text-[color:var(--text-muted)]">{t("signedOut")}</p>
          <Link href={loginUrl}>
            <Button>{th("ctaJoin")}</Button>
          </Link>
        </Card>
      </main>
    );
  }

  const menuItems = await getMenu("public");
  const siteConfig = await getSiteConfig();
  const staffPermissions = session?.user?.id
    ? await getStaffPermissions(session.user.id)
    : new Set<StaffPermission>();

  const targetVid = requestedVid || session.user.vid || "";
  const profileVid = targetVid || session.user.vid || "";
  const viewingOwnProfile = !requestedVid || targetVid === session.user.vid;

  const [user, ivaAccount, viewedUser, ceoAirlines] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        registrations: {
          include: { event: { select: { title: true, startTime: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        friends: { select: { id: true, name: true, vid: true } },
      },
    }),
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "ivao" },
      select: { access_token: true, expires_at: true },
    }),
    requestedVid
      ? prisma.user.findUnique({
          where: { vid: requestedVid },
          select: { name: true, vid: true, role: true },
        })
      : Promise.resolve(null),
    profileVid
      ? prisma.airline.findMany({
          where: { ceoVid: profileVid },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const fetchCreators = unstable_cache(
    async () => ivaoClient.getCreators("pt"),
    ["public-creators"],
    { revalidate: 900 },
  );
  const creatorsRaw = await fetchCreators();
  const creatorsList = Array.isArray((creatorsRaw as { items?: unknown }).items)
    ? (creatorsRaw as { items: unknown[] }).items
    : [];
  const creatorIds = new Set(
    creatorsList
      .map((item) => {
        const entry = item as { userId?: number | string; user?: { id?: number | string } };
        const id = entry.userId ?? entry.user?.id;
        return id ? String(id) : null;
      })
      .filter(Boolean) as string[],
  );
  const isCreator = Boolean(session.user.vid && creatorIds.has(session.user.vid));
  const creatorBannerUrl = user?.creatorBannerUrl ?? null;

  const isFuture = (epoch?: number | null) => {
    if (!epoch) return false;
    const now = Math.floor(new Date().getTime() / 1000);
    return epoch > now + 60;
  };

  const ivaoBearer = ivaAccount?.access_token && isFuture(ivaAccount.expires_at) ? ivaAccount.access_token : null;
  const isUnauthorized = (message: string) =>
    message.includes("401") || message.toLowerCase().includes("unauthorized");

  // Try user token on /me, then /{vid}, then API-key fallback.
  const fetchIvaoProfile = async (): Promise<{ data: unknown | null; error: string | null }> => {
    const attempts: Array<() => Promise<unknown>> = [];
    if (ivaoBearer) {
      attempts.push(() => ivaoClient.getCurrentUser(ivaoBearer ?? undefined));
      attempts.push(() => ivaoClient.getUserProfile(targetVid, ivaoBearer ?? undefined));
    }
    attempts.push(() => ivaoClient.getUserProfile(targetVid));

    let lastError: string | null = null;
    for (const attempt of attempts) {
      try {
        const data = await attempt();
        return { data, error: null };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lastError = msg;
        if (!isUnauthorized(msg.toLowerCase())) {
          return { data: null, error: lastError };
        }
        // unauthorized: continue to next attempt
      }
    }
    return { data: null, error: lastError };
  };

  const { data: ivaoProfileRaw, error: ivaoError } = await fetchIvaoProfile();
  const bookingsRaw =
    viewingOwnProfile && session.user.ivaoAccessToken
      ? await ivaoClient.getAtcBookings(session.user.ivaoAccessToken).catch(() => [])
      : [];
  const bookings = Array.isArray(bookingsRaw) ? bookingsRaw : [];
  const myBookings = bookings
    .map((b) => {
      const userId = (b as { userId?: unknown }).userId ?? (b as { user_id?: unknown }).user_id;
      const vid = (b as { vid?: unknown }).vid ?? (b as { userVid?: unknown }).userVid;
      const callsign = (b as { callsign?: unknown }).callsign ?? (b as { station?: unknown }).station;
      const start = (b as { startTime?: unknown }).startTime ?? (b as { start?: unknown }).start;
      const end = (b as { endTime?: unknown }).endTime ?? (b as { end?: unknown }).end;
      const startDate = start ? new Date(String(start)) : null;
      const endDate = end ? new Date(String(end)) : null;

      return {
        id: (b as { id?: unknown }).id,
        callsign: callsign ? String(callsign) : "",
        start: startDate,
        end: endDate,
        userId,
        vid,
      };
    })
    .filter(
      (b) =>
        (typeof b.userId === "string" && b.userId === session.user.id) ||
        (typeof b.userId === "number" && String(b.userId) === session.user.id) ||
        (typeof b.vid === "string" && session.user.vid && b.vid === session.user.vid),
    )
    .slice(0, 10);

  const unwrapProfile = (payload: unknown): unknown => {
    if (!payload || typeof payload !== "object") return null;
    const withKey = payload as { data?: unknown; result?: unknown; user?: unknown };
    const data = withKey.data;
    const result = withKey.result;
    const user = withKey.user;
    if (data && typeof data === "object" && "user" in (data as { user?: unknown })) {
      return (data as { user?: unknown }).user;
    }
    if (data) return data;
    if (result && typeof result === "object" && "user" in (result as { user?: unknown })) {
      return (result as { user?: unknown }).user;
    }
    if (result) return result;
    if (user) return user;
    return payload;
  };

  const ivaoProfile = unwrapProfile(ivaoProfileRaw);
  const profile = (ivaoProfile ?? {}) as {
    id?: string | number;
    vid?: string | number;
    firstName?: string;
    lastName?: string;
    division?: { name?: string; id?: string; code?: string };
    divisionId?: string;
    centerId?: string;
    countryId?: string;
    country?: { id?: string; code?: string; name?: string };
    countryCode?: string;
    createdAt?: string;
    isStaff?: boolean;
    isSupervisor?: boolean;
    languageId?: string;
    email?: string;
    rating?: {
      isPilot?: boolean;
      isAtc?: boolean;
      networkRating?: { id?: string | number; name?: string; description?: string };
      pilotRating?: { id?: string | number; name?: string; shortName?: string };
      atcRating?: { id?: string | number; name?: string; shortName?: string };
      pilot?: unknown;
      atc?: unknown;
    };
    ratings?: { pilot?: unknown; atc?: unknown };
    pilotRating?: unknown;
    pilot_rating?: unknown;
    atcRating?: unknown;
    atc_rating?: unknown;
    stats?: { pilot?: { hours?: number }; atc?: { hours?: number }; totalHours?: number | string };
    totalHours?: number | string;
    pilotHours?: number;
    pilot_hours?: number;
    atcHours?: number;
    atc_hours?: number;
    hours?: number | { type?: string; hours?: number }[];
    hoursTotal?: number | string;
    lastConnection?: string;
    last_connection?: string;
    lastSeen?: string;
    last_seen?: string;
    lastLogin?: string;
    gcas?: { divisionId?: string }[];
    userStaffDetails?: { email?: string; note?: string | null; description?: string | null; remark?: string | null };
    userStaffPositions?: {
      id?: string;
      divisionId?: string;
      staffPosition?: { name?: string; type?: string; departmentTeam?: { name?: string; department?: { name?: string } } };
      description?: string;
    }[];
    ownedVirtualAirlines?: { id?: string | number; name?: string; divisionId?: string; airlineId?: string }[];
    profile?: { city?: string; state?: string; birthday?: string };
    publicNickname?: string;
    profileUrl?: string;
  };

  const recentEvents = user?.registrations ?? [];

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
  const stringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

  const pickString = (...candidates: unknown[]): string | undefined => {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
      if (typeof c === "number") return String(c);
    }
    return undefined;
  };

  const parseCoord = (val: unknown) => {
    if (val == null) return NaN;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(",", ".");
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? num : NaN;
    }
    return NaN;
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const pickRating = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      const raw =
        (value as { short?: string }).short ??
        (value as { shortName?: string }).shortName ??
        (value as { long?: string }).long ??
        (value as { code?: string }).code ??
        (value as { name?: string }).name ??
        (value as { id?: string | number }).id;
      if (raw === null || raw === undefined) return undefined;
      const parsed = String(raw).trim();
      return parsed ? parsed : undefined;
    }
    return undefined;
  };

  const pilotRating =
    pickRating(profile.ratings?.pilot) ??
    pickRating(profile.rating?.pilotRating) ??
    pickRating(profile.rating?.pilotRating?.name) ??
    pickRating(profile.rating?.pilotRating?.shortName) ??
    pickRating(profile.rating?.pilotRating?.id) ??
    pickRating(profile.rating?.pilot) ??
    pickRating(profile.pilotRating) ??
    pickRating(profile.pilot_rating) ??
    pickRating(profile.rating);

  const atcRating =
    pickRating(profile.ratings?.atc) ??
    pickRating(profile.rating?.atcRating) ??
    pickRating(profile.rating?.atcRating?.name) ??
    pickRating(profile.rating?.atcRating?.shortName) ??
    pickRating(profile.rating?.atcRating?.id) ??
    pickRating(profile.rating?.atc) ??
    pickRating(profile.atcRating) ??
    pickRating(profile.atc_rating);

  const division =
    pickString(
      profile.division?.name,
      profile.division?.code,
      profile.division?.id,
      profile.divisionId,
      profile.country?.code,
      profile.country?.id,
      profile.countryId,
      profile.countryCode,
      profile.country?.name,
      profile.gcas?.[0]?.divisionId,
    ) ?? t("unknown");

  const hoursArray =
    profile && Array.isArray(profile.hours)
      ? (profile.hours as { type?: string; hours?: number }[])
      : [];

  const getHours = (label: string) =>
    hoursArray.find(
      (entry) =>
        typeof entry?.type === "string" &&
        entry.type.toLowerCase() === label.toLowerCase() &&
        typeof entry.hours === "number",
    )?.hours ?? 0;

  const normalizeHoursValue = (value: unknown): number => {
    if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
    if (value <= 0) return 0;

    const asMinutes = value / 60;
    const asSeconds = value / 3600;

    // Very large numbers are likely minutes or seconds.
    if (value > 100000) {
      if (asMinutes <= 20000) return asMinutes; // treat as minutes
      if (asSeconds <= 20000) return asSeconds; // treat as seconds
    }

    // Likely minutes if big enough and near a multiple of 60.
    if (value > 600) {
      const minutesMatch = Math.abs(value - Math.round(asMinutes) * 60) <= 2;
      if (minutesMatch || asMinutes <= 20000) return asMinutes;
    }

    return value;
  };

  const pilotHours =
    normalizeHoursValue(
      Number(
        pickString(
          profile.stats?.pilot?.hours,
          profile.pilotHours,
          profile.pilot_hours,
        ),
      ) || getHours("pilot"),
    );

  const atcHours =
    normalizeHoursValue(
      Number(
        pickString(
          profile.stats?.atc?.hours,
          profile.atcHours,
          profile.atc_hours,
        ),
      ) || getHours("atc"),
    );

  const hoursArrayNormalizedSum = hoursArray.reduce(
    (sum, entry) =>
      sum +
      (typeof entry?.hours === "number"
        ? normalizeHoursValue(entry.hours)
        : 0),
    0,
  );

  const totalHours =
    normalizeHoursValue(
      Number(
        pickString(
          profile.stats?.totalHours,
          profile.totalHours,
          profile.hoursTotal,
          typeof profile.hours === "number" ? profile.hours : undefined,
        ),
      ),
    ) ||
    (hoursArrayNormalizedSum > 0 ? hoursArrayNormalizedSum : 0) ||
    (pilotHours + atcHours);
  const lastSeen =
    pickString(
      profile.lastConnection,
      profile.last_connection,
      profile.lastSeen,
      profile.last_seen,
      profile.lastLogin,
    ) || undefined;
  const profileLink = pickString(
    (ivaoProfile as { profile?: unknown })?.profile,
    profile.profileUrl,
  );
  const fullName = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
  const createdAtDisplay = profile.createdAt ? new Date(profile.createdAt).toLocaleDateString(locale) : t("unknown");
  const rawProfilePayload = ivaoProfile
    ? JSON.stringify(
        ivaoProfile,
        (key, value) => (key.toLowerCase() === "email" ? "[hidden]" : value),
        2,
      )
    : "";

  const hasHours =
    Number.isFinite(totalHours) || Number.isFinite(pilotHours) || Number.isFinite(atcHours);
  const totalHoursDisplay =
    Number.isFinite(totalHours)
      ? totalHours
      : (Number.isFinite(hoursArrayNormalizedSum) && hoursArrayNormalizedSum > 0
          ? hoursArrayNormalizedSum
          : (Number.isFinite(pilotHours) ? pilotHours : 0) + (Number.isFinite(atcHours) ? atcHours : 0));
  const pilotHoursDisplay = Number.isFinite(pilotHours) ? pilotHours : 0;
  const atcHoursDisplay = Number.isFinite(atcHours) ? atcHours : 0;
  const hasIvaoAuthIssue =
    typeof ivaoError === "string" &&
    (ivaoError.includes("401") || ivaoError.toLowerCase().includes("unauthorized"));

  const formatHours = (value: number): string => {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    const adjHours = hours + (minutes === 60 ? 1 : 0);
    const adjMinutes = minutes === 60 ? 0 : minutes;
    return adjMinutes > 0 ? `${adjHours}h ${adjMinutes}m` : `${adjHours}h`;
  };

  const staffPositions = Array.isArray(profile.userStaffPositions)
    ? profile.userStaffPositions
        .map((pos) => ({
          id: pos.id ?? "",
          name: pos.staffPosition?.name ?? pos.staffPosition?.type ?? "",
          division: pos.divisionId ?? profile.division?.code ?? profile.divisionId ?? "",
          department: pos.staffPosition?.departmentTeam?.department?.name,
          team: pos.staffPosition?.departmentTeam?.name,
          description: pos.description,
        }))
        .filter((p) => p.name)
    : [];

  const gcaDivisions = Array.isArray(profile.gcas)
    ? profile.gcas
        .map((g) => g.divisionId)
        .filter((val): val is string => typeof val === "string" && val.trim().length > 0)
    : [];

  const whazzup = await ivaoClient.getWhazzup().catch(() => null);
  const whazzupPilots = asArray((whazzup as { clients?: { pilots?: unknown } })?.clients?.pilots);
  const whazzupAtc = asArray(
    (whazzup as { clients?: { atc?: unknown; atcs?: unknown; controllers?: unknown } })?.clients?.atc ??
      (whazzup as { clients?: { atcs?: unknown; controllers?: unknown } })?.clients?.atcs ??
      (whazzup as { clients?: { controllers?: unknown } })?.clients?.controllers,
  );
  const targetVidValue = pickString(profileVid, session.user.vid) ?? "";
  const getVid = (entry: Record<string, unknown>) =>
    pickString(
      entry.vid,
      entry.userId,
      (entry as { user_id?: unknown }).user_id,
      entry.id,
      (entry as { cid?: unknown }).cid,
      (entry as { clientId?: unknown }).clientId,
      (entry as { client_id?: unknown }).client_id,
      entry.sub,
    );
  const onlinePilot = whazzupPilots.find((entry) => getVid(entry) === targetVidValue);
  const onlineAtc = whazzupAtc.find((entry) => getVid(entry) === targetVidValue);
  const liveSession = onlinePilot ?? onlineAtc ?? null;
  const liveRole = onlinePilot ? "PILOT" : onlineAtc ? "ATC" : "OFFLINE";
  const liveCallsign = liveSession ? pickString(liveSession.callsign, liveSession.name) : undefined;
  const liveAircraft = onlinePilot
    ? pickString(
        onlinePilot.aircraft,
        (onlinePilot as { flightPlan?: { aircraftId?: unknown } }).flightPlan?.aircraftId,
        (onlinePilot as { aircraft_id?: unknown }).aircraft_id,
        onlinePilot.plane,
      )
    : undefined;
  const liveFrequency = onlineAtc
    ? pickString(
        onlineAtc.frequency,
        (onlineAtc as { freq?: unknown }).freq,
        (onlineAtc as { radio?: unknown }).radio,
      )
    : undefined;
  const extractIcao = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
    if (value && typeof value === "object") {
      const obj = value as { icao?: unknown; code?: unknown; id?: unknown; name?: unknown };
      return pickString(obj.icao, obj.code, obj.id, obj.name)?.toUpperCase();
    }
    return undefined;
  };
  const getDepartureIcao = (flight: Record<string, unknown>) =>
    extractIcao(flight.departure) ??
    extractIcao(flight.departureId) ??
    extractIcao((flight.flightPlan as { departureId?: unknown } | undefined)?.departureId) ??
    extractIcao(flight.origin) ??
    extractIcao(flight.from) ??
    extractIcao(flight.dep);
  const getArrivalIcao = (flight: Record<string, unknown>) =>
    extractIcao(flight.arrival) ??
    extractIcao(flight.arrivalId) ??
    extractIcao((flight.flightPlan as { arrivalId?: unknown } | undefined)?.arrivalId) ??
    extractIcao(flight.destination) ??
    extractIcao(flight.to) ??
    extractIcao(flight.arr);
  const liveDeparture = onlinePilot ? getDepartureIcao(onlinePilot) : undefined;
  const liveArrival = onlinePilot ? getArrivalIcao(onlinePilot) : undefined;
  const livePosition = liveSession
    ? {
        lat: parseCoord(
          (liveSession as { lastTrack?: { latitude?: unknown } }).lastTrack?.latitude ??
            (liveSession as { lastTrack?: { lat?: unknown } }).lastTrack?.lat ??
            (liveSession as { location?: { latitude?: unknown } }).location?.latitude ??
            (liveSession as { location?: { lat?: unknown } }).location?.lat ??
            (liveSession as { position?: { latitude?: unknown } }).position?.latitude ??
            (liveSession as { position?: { lat?: unknown } }).position?.lat ??
            (liveSession as { latitude?: unknown }).latitude ??
            (liveSession as { lat?: unknown }).lat,
        ),
        lon: parseCoord(
          (liveSession as { lastTrack?: { longitude?: unknown } }).lastTrack?.longitude ??
            (liveSession as { lastTrack?: { lon?: unknown } }).lastTrack?.lon ??
            (liveSession as { location?: { longitude?: unknown } }).location?.longitude ??
            (liveSession as { location?: { lon?: unknown } }).location?.lon ??
            (liveSession as { position?: { longitude?: unknown } }).position?.longitude ??
            (liveSession as { position?: { lon?: unknown } }).position?.lon ??
            (liveSession as { longitude?: unknown }).longitude ??
            (liveSession as { lon?: unknown }).lon,
        ),
      }
    : null;
  const hasLivePosition =
    livePosition && Number.isFinite(livePosition.lat) && Number.isFinite(livePosition.lon);
  const liveAirports =
    liveRole === "PILOT" && liveDeparture && liveArrival
      ? await prisma.airport.findMany({
          where: { icao: { in: [liveDeparture, liveArrival] } },
          select: { icao: true, latitude: true, longitude: true },
        })
      : [];
  const liveAirportMap = new Map(
    liveAirports.map((airport) => [airport.icao.toUpperCase(), airport]),
  );
  const flightProgress = (() => {
    if (liveRole !== "PILOT") return 0.5;
    if (!liveDeparture || !liveArrival || !hasLivePosition) return 0.5;
    const dep = liveAirportMap.get(liveDeparture);
    const arr = liveAirportMap.get(liveArrival);
    if (!dep || !arr) return 0.5;
    const total = haversineMeters(dep.latitude, dep.longitude, arr.latitude, arr.longitude);
    if (!Number.isFinite(total) || total <= 1000) return 0.5;
    const remaining = haversineMeters(livePosition.lat, livePosition.lon, arr.latitude, arr.longitude);
    const progress = 1 - remaining / total;
    return clamp(progress, 0, 1);
  })();
  const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
  const lastSeenDisplay =
    lastSeenDate && Number.isFinite(lastSeenDate.getTime()) ? formatDateTimeLocal(lastSeenDate) : lastSeen;

  const eventsRaw = await ivaoClient.getEvents().catch(() => []);
  const eventsArray = asArray(
    (eventsRaw as { events?: unknown }).events ??
      (eventsRaw as { result?: unknown }).result ??
      eventsRaw,
  );
  const toIdString = (value: unknown) => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
  };

  const events = eventsArray
    .map((raw) => {
      const fallbackTitle =
        stringOrNull((raw as { title?: unknown }).title) ??
        stringOrNull((raw as { name?: unknown }).name) ??
        "event";
      const eventUrl =
        stringOrNull((raw as { infoUrl?: unknown }).infoUrl) ??
        stringOrNull((raw as { briefingUrl?: unknown }).briefingUrl) ??
        stringOrNull((raw as { briefing_url?: unknown }).briefing_url) ??
        stringOrNull((raw as { url?: unknown }).url) ??
        stringOrNull((raw as { link?: unknown }).link) ??
        stringOrNull((raw as { webUrl?: unknown }).webUrl) ??
        stringOrNull((raw as { website?: unknown }).website);
      const start =
        stringOrNull((raw as { start?: unknown }).start) ??
        stringOrNull((raw as { startDate?: unknown }).startDate) ??
        stringOrNull((raw as { startTime?: unknown }).startTime) ??
        stringOrNull((raw as { start_at?: unknown }).start_at) ??
        stringOrNull((raw as { start_date?: unknown }).start_date);
      const end =
        stringOrNull((raw as { end?: unknown }).end) ??
        stringOrNull((raw as { endDate?: unknown }).endDate) ??
        stringOrNull((raw as { endTime?: unknown }).endTime) ??
        stringOrNull((raw as { end_at?: unknown }).end_at) ??
        stringOrNull((raw as { end_date?: unknown }).end_date);

      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;

      const eventId =
        toIdString((raw as { id?: unknown }).id) ??
        toIdString((raw as { uuid?: unknown }).uuid) ??
        toIdString((raw as { eventId?: unknown }).eventId);
      const resolvedEventUrl = (() => {
        if (eventUrl && /^https?:\/\//i.test(eventUrl)) return eventUrl;
        if (eventId) return `https://ivao.events/${eventId}`;
        return eventUrl ?? null;
      })();

      return {
        id:
          eventId ??
          `event-${startDate?.getTime() ?? "unknown"}-${fallbackTitle.replace(/\s+/g, "-").toLowerCase()}`,
        title:
          fallbackTitle === "event" ? "IVAO Event" : fallbackTitle,
        bannerUrl:
          stringOrNull((raw as { banner?: unknown }).banner) ??
          stringOrNull((raw as { bannerUrl?: unknown }).bannerUrl) ??
          stringOrNull((raw as { imageUrl?: unknown }).imageUrl) ??
          stringOrNull((raw as { image_url?: unknown }).image_url),
        eventUrl: resolvedEventUrl,
        startTime: startDate,
        endTime: endDate,
      };
    })
    .filter((event): event is { id: string; title: string; bannerUrl: string | null; startTime: Date | null; endTime: Date | null; eventUrl: string | null } =>
      Boolean(event && event.startTime),
    );
  const upcomingEvents = events
    .filter((event) => event.startTime && event.startTime >= new Date())
    .sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0))
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.title,
      bannerUrl: event.bannerUrl,
      startTime: event.startTime?.toISOString() ?? new Date().toISOString(),
      eventUrl:
        event.eventUrl ??
        (/^\d+$/.test(event.id) ? `https://ivao.events/${event.id}` : null),
    }));

  const locationParts = [
    profile.profile?.city,
    profile.profile?.state,
    profile.country?.name ?? profile.country?.code ?? division,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  const birthday = profile.profile?.birthday;
  const pilotRatingId = pickString(
    profile.rating?.pilotRating?.id,
    profile.pilot_rating,
    profile.pilotRating,
  );
  const pilotRatingLabel = pickString(
    profile.rating?.pilotRating?.shortName,
    profile.rating?.pilotRating?.name,
    pilotRating,
  );
  const atcRatingId = pickString(
    profile.rating?.atcRating?.id,
    profile.atc_rating,
    profile.atcRating,
  );
  const atcRatingLabel = pickString(
    profile.rating?.atcRating?.shortName,
    profile.rating?.atcRating?.name,
    atcRating,
  );
  const networkRatingId = pickString(profile.rating?.networkRating?.id);
  const networkRatingLabel = pickString(profile.rating?.networkRating?.name);
  const customBadge = (tag?: string | null) => {
    if (!tag) return "";
    const upper = tag.toUpperCase();
    return siteConfig.ratingBadgesCustom[upper] || siteConfig.ratingBadgesCustom[tag] || "";
  };
  const pilotBadgeUrl =
    customBadge(pilotRatingLabel) ||
    customBadge(pilotRatingId) ||
    (pilotRatingId && siteConfig.ratingBadgesPilot[pilotRatingId]) ||
    (pilotRatingLabel && siteConfig.ratingBadgesPilot[pilotRatingLabel]) ||
    "";
  const atcBadgeUrl =
    customBadge(atcRatingLabel) ||
    customBadge(atcRatingId) ||
    (atcRatingId && siteConfig.ratingBadgesAtc[atcRatingId]) ||
    (atcRatingLabel && siteConfig.ratingBadgesAtc[atcRatingLabel]) ||
    "";
  const networkBadgeUrl =
    customBadge(networkRatingLabel) ||
    customBadge(networkRatingId) ||
    (networkRatingId && siteConfig.ratingBadgesNetwork[networkRatingId]) ||
    (networkRatingLabel && siteConfig.ratingBadgesNetwork[networkRatingLabel]) ||
    "";
  const ratingBadges = [pilotBadgeUrl, atcBadgeUrl, networkBadgeUrl].filter(Boolean);

  if (ivaoError) {
    console.error("[profile] IVAO profile fetch failed", { ivaoError, hasIvaoAuthIssue, ivaoBearer: Boolean(ivaoBearer) });
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 px-6 py-10 lg:px-12">
      <Navbar
        locale={locale}
        user={session.user}
        items={menuItems}
        allowedPermissions={Array.from(staffPermissions)}
        isAdmin={session.user.role === "ADMIN"}
        brandName={siteConfig.divisionName}
        logoUrl={siteConfig.logoFullUrl}
        logoDarkUrl={siteConfig.logoFullDarkUrl || undefined}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{t("title")}</div>

        <Card className="overflow-hidden p-0">
          <div
            className="relative h-[84px] overflow-hidden bg-[color:var(--primary)]"
            style={{
              backgroundImage:
                "linear-gradient(110deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05) 45%, rgba(0,0,0,0.15))",
            }}
          >
            <div className="absolute inset-0 opacity-20" />
            <div className="relative flex h-full items-center px-6">
              <p className="text-2xl font-semibold text-white">
                {viewingOwnProfile
                  ? `Hey ${profile.firstName ?? session.user.name ?? "there"}`
                  : `This is ${profile.firstName ?? session.user.name ?? "them"}`}
              </p>
            </div>
          </div>
        </Card>
        {viewingOwnProfile && isCreator ? (
          <Card className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Creator banner</p>
              <p className="text-sm text-[color:var(--text-muted)]">
                Upload a banner image for the home creators slider.
              </p>
            </div>
            {creatorBannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creatorBannerUrl}
                alt=""
                className="h-32 w-full rounded-2xl border border-[color:var(--border)] object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
                No banner uploaded yet.
              </div>
            )}
            <form action={updateCreatorBannerAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input
                type="file"
                name="creatorBanner"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="w-full text-xs text-[color:var(--text-muted)]"
              />
              <Button size="sm" type="submit">
                Upload banner
              </Button>
            </form>
            {creatorBannerUrl ? (
              <form action={deleteCreatorBannerAction}>
                <input type="hidden" name="locale" value={locale} />
                <Button size="sm" variant="ghost" type="submit">
                  Remove banner
                </Button>
              </form>
            ) : null}
          </Card>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-2 p-4">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              {viewingOwnProfile
                ? session.user.name ?? t("title")
                : viewedUser?.name ?? profile.publicNickname ?? t("title")}
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">VID: {targetVid || session.user.vid}</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Country: {profile.country?.name ?? profile.country?.code ?? profile.countryId ?? t("unknown")}
              {locationParts.length ? ` | City: ${locationParts[0]}` : ""}
            </p>
            <p className="text-xs text-[color:var(--text-muted)]">Division: {division}</p>
            {ratingBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {ratingBadges.map((badge) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={badge} src={badge} alt="" className="h-8 w-auto" />
                ))}
              </div>
            ) : null}
            <p className="text-xs text-[color:var(--text-muted)]">
              Online Time: {hasHours ? formatHours(totalHoursDisplay) : t("unknown")}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a href="https://ivao.events" target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary">
                  {th("ctaEvents")}
                </Button>
              </a>
              <form action={`/${locale}/profile`} className="flex items-center gap-2">
                <input
                  name="vid"
                  placeholder="VID"
                  defaultValue={requestedVid}
                  className="w-24 rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                />
                <Button size="sm" variant="secondary" type="submit">
                  View
                </Button>
              </form>
            </div>
          </Card>

          {liveRole === "OFFLINE" ? (
            <>
              <Card className="flex h-full flex-col overflow-hidden p-0">
                <div className="flex flex-1 flex-col justify-center bg-[color:var(--danger)] px-4 py-3 text-white">
                  <p className="text-sm font-semibold">OFFLINE</p>
                  <p className="text-xs text-white/80">
                    {lastSeenDisplay ? `Last connected ${lastSeenDisplay}` : "No recent session data."}
                  </p>
                </div>
                <div className="grid items-center divide-y divide-[color:var(--border)] bg-[color:var(--surface-2)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                      <span>Pilot</span>
                      {pilotBadgeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pilotBadgeUrl} alt="" className="h-8 w-auto" />
                      ) : (
                        <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {pilotRating ?? "PILOT"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatHours(pilotHoursDisplay)}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">Total pilot time</p>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                      <span>ATC</span>
                      {atcBadgeUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={atcBadgeUrl} alt="" className="h-8 w-auto" />
                      ) : (
                        <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                          {atcRating ?? "ATC"}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatHours(atcHoursDisplay)}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">Total ATC time</p>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden p-0">
                <ProfileEventsCarousel events={upcomingEvents} locale={locale} />
              </Card>
            </>
          ) : (
            <Card className="overflow-hidden p-0 lg:col-span-2">
              <div className="overflow-hidden rounded-2xl bg-[color:var(--surface)]">
                <div className="bg-[color:var(--primary)] p-4 text-white">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.12em] text-white/70">
                    <span>{liveDeparture ?? "----"}</span>
                    <span>{liveArrival ?? "----"}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">{liveCallsign ?? t("unknown")}</p>
                      <p className="text-xs text-white/70">{liveRole === "PILOT" ? "Pilot session" : "ATC session"}</p>
                    </div>
                    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                      {liveAircraft ?? liveFrequency ?? liveRole}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
                    <div className="h-full bg-white" style={{ width: `${Math.round(flightProgress * 100)}%` }} />
                  </div>
                </div>
                <div className="grid h-full bg-[color:var(--surface-2)] sm:grid-cols-2 divide-y divide-[color:var(--border)] sm:divide-y-0 sm:divide-x">
                  <div className="flex h-full items-center gap-3 bg-[color:var(--surface-2)] p-3">
                    {pilotBadgeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pilotBadgeUrl} alt="" className="h-8 w-auto" />
                    ) : (
                      <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                        {pilotRating ?? "PILOT"}
                      </span>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Pilot</p>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {formatHours(pilotHoursDisplay)}
                      </p>
                    </div>
                  </div>
                  <div className="flex h-full items-center gap-3 bg-[color:var(--surface-2)] p-3">
                    {atcBadgeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={atcBadgeUrl} alt="" className="h-8 w-auto" />
                    ) : (
                      <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                        {atcRating ?? "ATC"}
                      </span>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">ATC</p>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {formatHours(atcHoursDisplay)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("ivaoProfile")}</p>
              {profileLink ? (
                <a
                  href={profileLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[color:var(--primary)] underline"
                >
                  IVAO profile
                </a>
              ) : null}
            </div>
            {ivaoProfile ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">VID</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{pickString(profile.vid, profile.id) ?? t("unknown")}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Name</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{fullName || profile.publicNickname || t("unknown")}</p>
                  </div>
                  {profile.publicNickname ? (
                    <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Public nickname</p>
                      <p className="text-sm text-[color:var(--text-primary)]">{profile.publicNickname}</p>
                    </div>
                  ) : null}
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("division")}</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{division}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Center</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{profile.centerId ?? profile.divisionId ?? t("unknown")}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Country</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{profile.countryId ?? profile.country?.code ?? t("unknown")}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Language</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{profile.languageId ?? t("unknown")}</p>
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Network rating</p>
                    <p className="text-sm text-[color:var(--text-primary)]">
                      {profile.rating?.networkRating?.name ?? t("unknown")}
                    </p>
                    {profile.rating?.networkRating?.description ? (
                      <p className="text-xs text-[color:var(--text-muted)]">{profile.rating.networkRating.description}</p>
                    ) : null}
                  </div>
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Joined</p>
                    <p className="text-sm text-[color:var(--text-primary)]">{createdAtDisplay}</p>
                  </div>
                  {lastSeen ? (
                    <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("lastSeen")}</p>
                      <p className="text-sm text-[color:var(--text-primary)]">{lastSeen}</p>
                    </div>
                  ) : null}
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Staff</p>
                    <p className="text-sm text-[color:var(--text-primary)]">
                      {profile.isStaff ? "Yes" : "No"} / {profile.isSupervisor ? "Supervisor" : "Member"}
                    </p>
                  </div>
                  {ceoAirlines.length > 0 ? (
                    <div className="rounded-lg bg-[color:var(--surface-2)] p-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Airline CEO</p>
                      <p className="text-sm text-[color:var(--text-primary)]">
                        {ceoAirlines.map((airline) => airline.name).join(", ")}
                      </p>
                    </div>
                  ) : null}
                </div>
                {profile.userStaffDetails?.description || profile.userStaffDetails?.note || profile.userStaffDetails?.remark ? (
                  <div className="rounded-lg bg-[color:var(--surface-2)] p-3 text-sm text-[color:var(--text-muted)]">
                    {profile.userStaffDetails?.description ? (
                      <p>Description: {profile.userStaffDetails.description}</p>
                    ) : null}
                    {profile.userStaffDetails?.note ? <p>Note: {profile.userStaffDetails.note}</p> : null}
                    {profile.userStaffDetails?.remark ? <p>Remark: {profile.userStaffDetails.remark}</p> : null}
                  </div>
                ) : null}
                {session.user.role === "ADMIN" ? (
                  <details className="rounded-lg bg-[color:var(--surface-2)] p-3 text-sm text-[color:var(--text-muted)]">
                    <summary className="cursor-pointer text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                      Raw IVAO payload
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
                      {rawProfilePayload || t("unknown")}
                    </pre>
                  </details>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
                <p className="text-sm text-[color:var(--text-muted)]">
                  {hasIvaoAuthIssue ? t("ivaoAuthRequired") : t("ivaoUnavailable")}
                </p>
                {ivaoError ? (
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">IVAO: {ivaoError}</p>
                ) : null}
              </div>
            )}
          </Card>

          {ivaoProfile && staffPositions.length > 0 ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("staffRolesTitle")}</p>
              <div className="grid gap-2 md:grid-cols-2">
                {staffPositions.map((pos) => (
                  <div
                    key={pos.id + pos.name}
                    className="rounded-lg bg-[color:var(--surface-2)] p-2 text-sm"
                  >
                    <p className="font-semibold text-[color:var(--text-primary)]">{pos.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {pos.team ?? pos.department ?? ""} {pos.division ? `| ${pos.division}` : ""}
                    </p>
                    {pos.description ? (
                      <p className="text-xs text-[color:var(--text-muted)]">{pos.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
          <div className="flex flex-col gap-6">
          {ivaoProfile ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("locationTitle")}</p>
              {locationParts.length > 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">{locationParts.join(", ")}</p>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">{t("unknown")}</p>
              )}
              {birthday ? (
                <p className="text-xs text-[color:var(--text-muted)]">
                  {t("birthday")}: {birthday}
                </p>
              ) : null}
            </Card>
          ) : null}

          {ivaoProfile && gcaDivisions.length > 0 ? (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("gcaTitle")}</p>
              <p className="text-sm text-[color:var(--text-muted)]">{gcaDivisions.join(", ")}</p>
            </Card>
          ) : null}

          {ceoAirlines.length > 0 ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Airline CEO</p>
              <div className="space-y-3">
                {ceoAirlines.map((airline) => (
                  <div key={airline.icao} className="rounded-lg bg-[color:var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{airline.name}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {airline.icao} {airline.website ? `| ${airline.website}` : ""}
                        </p>
                      </div>
                    </div>
                    {viewingOwnProfile ? (
                      <div className="mt-3 grid gap-2">
                        <form action={updateCeoAirlineLogoAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <input type="hidden" name="variant" value="light" />
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="w-full text-xs text-[color:var(--text-muted)]"
                          />
                          <Button size="sm" type="submit">
                            Upload light logo
                          </Button>
                        </form>
                        <form action={updateCeoAirlineLogoAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="icao" value={airline.icao} />
                          <input type="hidden" name="variant" value="dark" />
                          <input
                            type="file"
                            name="logo"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            className="w-full text-xs text-[color:var(--text-muted)]"
                          />
                          <Button size="sm" type="submit">
                            Upload dark logo
                          </Button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {viewingOwnProfile ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("staffProfileTitle")}</p>
              <p className="text-sm text-[color:var(--text-muted)]">{t("staffProfileDescription")}</p>
              <form action={updateStaffProfileAction} className="space-y-3">
                <input type="hidden" name="locale" value={locale} />
                <label className="space-y-1 text-sm">
                  <span className="text-[color:var(--text-muted)]">{t("staffProfilePhotoLabel")}</span>
                  <input
                    name="staffPhotoUrl"
                    defaultValue={user?.staffPhotoUrl ?? ""}
                    placeholder="https://"
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-[color:var(--text-muted)]">{t("staffProfileBioLabel")}</span>
                  <textarea
                    name="staffBio"
                    defaultValue={user?.staffBio ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                  <input
                    type="checkbox"
                    name="publicStaffProfile"
                    defaultChecked={Boolean(user?.publicStaffProfile)}
                    className="h-4 w-4"
                  />
                  <span>{t("staffProfilePublic")}</span>
                </label>
                <p className="text-xs text-[color:var(--text-muted)]">{t("staffProfileVisibilityHelp")}</p>
                <div className="flex justify-end">
                  <Button size="sm" type="submit">
                    {t("staffProfileSave")}
                  </Button>
                </div>
              </form>
            </Card>
          ) : null}

          {viewingOwnProfile ? (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">My ATC bookings</p>
                <span className="text-xs text-[color:var(--text-muted)]">{myBookings.length}</span>
              </div>
              {myBookings.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {myBookings.map((b) => (
                    <form
                      key={`${b.id}-${b.callsign}`}
                      action={deleteAtcBookingAction}
                      className="flex items-center justify-between rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                    >
                      <input type="hidden" name="bookingId" value={String(b.id ?? "")} />
                      <div className="space-y-1">
                        <p className="font-semibold text-[color:var(--text-primary)]">{b.callsign}</p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          {b.start ? formatDateTimeLocal(b.start) : "?"} {b.end ? `- ${formatDateTimeLocal(b.end)}` : ""}
                        </p>
                      </div>
                      <Button size="sm" variant="secondary">
                        Delete
                      </Button>
                    </form>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {viewingOwnProfile ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("activity")}</p>
              {recentEvents.length ? (
                <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
                  {recentEvents.map((reg) => (
                    <li key={reg.id} className="rounded-lg bg-[color:var(--surface-2)] p-2">
                      <p className="text-[color:var(--text-primary)]">{reg.event.title}</p>
                      <p className="text-xs">{formatDateTime(reg.event.startTime)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
              )}
            </Card>
          ) : null}

          {viewingOwnProfile ? (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("friends") ?? "Friends"}</p>
              {user?.friends.length ? (
                <div className="flex flex-wrap gap-2">
                  {user.friends.map((f) => (
                    <span
                      key={f.id}
                      className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm text-[color:var(--text-primary)]"
                    >
                      {f.name ?? f.vid ?? f.id}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
              )}
            </Card>
          ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

