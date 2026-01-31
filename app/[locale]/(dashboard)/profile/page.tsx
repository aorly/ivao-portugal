import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { UserAvatar } from "@/components/ui/avatar";
import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/navigation/footer";
import { ProfileEventsCarousel } from "@/components/profile-events-carousel";
import { BookStationModal } from "@/components/public/book-station-modal";
import { FeedbackForm } from "@/components/public/feedback-form";
import { ProfileEditModal } from "@/components/profile-edit-modal";
import { auth } from "@/lib/auth";
import { AVATAR_COLOR_OPTIONS, type AvatarColorKey } from "@/lib/avatar-colors";
import { ivaoClient } from "@/lib/ivaoClient";
import { getMenu } from "@/lib/menu";
import { prisma } from "@/lib/prisma";
import { getSiteConfig } from "@/lib/site-config";
import { type StaffPermission, getStaffPermissions } from "@/lib/staff";
import { type Locale } from "@/i18n";
import { createAtcBookingAction } from "@/app/[locale]/(public)/home/actions";
import {
  submitTestimonialAction,
  updateAvatarColorAction,
  updateAvatarUrlAction,
  updateStaffProfileAction,
} from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ vid?: string }>;
};

export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: "profile" });
  const tf = await getTranslations({ locale, namespace: "feedback" });
  const tl = await getTranslations({ locale, namespace: "login" });
  const session = await auth();
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/profile`)}`;
  const requestedVid = sp.vid ? String(sp.vid).trim() : "";
  const menuItems = await getMenu("public");
  const footerItems = await getMenu("footer");
  const siteConfig = await getSiteConfig();
  const staffPermissions = session?.user?.id
    ? await getStaffPermissions(session.user.id)
    : new Set<StaffPermission>();

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
  const formatInputDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  if (!session?.user) {
    return (
      <div className="flex min-h-screen flex-col gap-6 px-6 py-10 lg:px-12">
        <Navbar
          locale={locale}
          items={menuItems}
          allowedPermissions={Array.from(staffPermissions)}
          isAdmin={false}
          brandName={siteConfig.divisionName}
          logoUrl={siteConfig.logoFullUrl}
          logoDarkUrl={siteConfig.logoFullDarkUrl || undefined}
          socialLinks={{
            facebookUrl: siteConfig.socialFacebookUrl,
            discordUrl: siteConfig.socialDiscordUrl,
            instagramUrl: siteConfig.socialInstagramUrl,
            xUrl: siteConfig.socialXUrl,
            forumUrl: siteConfig.socialForumUrl,
          }}
        />
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
          <main className="flex flex-col gap-6">
            <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
            <Card className="space-y-4 p-4">
              <p className="text-sm text-[color:var(--text-muted)]">{t("signedOut")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={loginUrl}>
                  <Button>{tl("button")}</Button>
                </Link>
                <Link
                  href={`/${locale}/home`}
                  className="text-sm font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                >
                  {t("backHome")}
                </Link>
              </div>
            </Card>
          </main>
          <Footer
            locale={locale}
            items={footerItems}
            allowedPermissions={Array.from(staffPermissions)}
            isAdmin={false}
            role={session?.user?.role}
            brandName={siteConfig.divisionName}
            logoUrl={siteConfig.logoCompactUrl || siteConfig.logoFullUrl}
            logoDarkUrl={siteConfig.logoCompactDarkUrl || siteConfig.logoFullDarkUrl || undefined}
            tagline={siteConfig.footerTagline}
            countries={siteConfig.countries}
            supportEmail={siteConfig.supportEmail}
            websiteUrl={siteConfig.websiteUrl}
          />
        </div>
      </div>
    );
  }

  const targetVid = requestedVid || session.user.vid || "";
  const profileVid = targetVid || session.user.vid || "";
  const viewingOwnProfile = !requestedVid || targetVid === session.user.vid;

  const [user, ivaAccount, viewedUser] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        registrations: {
          include: { event: { select: { title: true, startTime: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        friends: { select: { id: true, name: true, vid: true } },
        testimonials: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "ivao" },
      select: { access_token: true, expires_at: true },
    }),
    requestedVid
      ? prisma.user.findUnique({
          where: { vid: requestedVid },
          select: { id: true, name: true, vid: true, role: true },
        })
      : Promise.resolve(null),
  ]);
  const avatarName = user?.name ?? session.user.name ?? "Member";
  const avatarUrl = user?.avatarUrl ?? user?.image ?? null;
  const avatarColor = user?.avatarColor ?? null;
  const avatarColorKey = AVATAR_COLOR_OPTIONS.some((option) => option.key === avatarColor)
    ? (avatarColor as AvatarColorKey)
    : null;

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

  const sessionsRaw = profileVid
    ? await ivaoClient.getTrackerSessions({ page: 1, perPage: 5, userId: profileVid })
    : { items: [] };
  const sessionsItems = asArray((sessionsRaw as { items?: unknown }).items).slice(0, 5);
  const sessions = sessionsItems.map((item) => {
    const plan = asArray((item as { flightPlans?: unknown }).flightPlans)[0] ?? null;
    const departure = pickPlanValue(plan, ["departureId", "departure", "origin"]);
    const arrival = pickPlanValue(plan, ["arrivalId", "arrival", "destination"]);
    const aircraft = pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]);
    const callsign = pickString((item as { callsign?: unknown }).callsign) ?? t("unknown");
    const connectionType = pickString((item as { connectionType?: unknown }).connectionType) ?? "SESSION";
    const timeSeconds = Number((item as { time?: unknown }).time);
    const createdAtRaw = pickString((item as { createdAt?: unknown }).createdAt);
    const completedAtRaw = pickString(
      (item as { completedAt?: unknown }).completedAt,
      (item as { updatedAt?: unknown }).updatedAt,
    );
    const createdAt = toDateOrNull(createdAtRaw);
    const completedAt = toDateOrNull(completedAtRaw);
    const startLabel = createdAt ? formatDateTime(createdAt) : t("unknown");
    const endLabel = completedAt ? formatDateTime(completedAt) : null;
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

  const now = new Date();
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
  const formatUtc = (date: Date) => date.toISOString().slice(0, 19);
  const pilotStatsRaw = profileVid
    ? await ivaoClient.getTrackerSessions({
        page: 1,
        perPage: 50,
        userId: profileVid,
        connectionType: "PILOT",
        from: formatUtc(lastMonthStart),
        to: formatUtc(lastMonthEnd),
      })
    : { items: [] };
  const atcStatsRaw = profileVid
    ? await ivaoClient.getTrackerSessions({
        page: 1,
        perPage: 50,
        userId: profileVid,
        connectionType: "ATC",
        from: formatUtc(lastMonthStart),
        to: formatUtc(lastMonthEnd),
      })
    : { items: [] };
  const pilotStatsItems = asArray((pilotStatsRaw as { items?: unknown }).items);
  const atcStatsItems = asArray((atcStatsRaw as { items?: unknown }).items);
  const recentSessions = [...pilotStatsItems, ...atcStatsItems];

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

  const recentPilotSessions = pilotStatsItems;
  const recentAtcSessions = atcStatsItems;

  const pilotAircraft = recentPilotSessions.map((item) => {
    const plan = asArray((item as { flightPlans?: unknown }).flightPlans)[0] ?? null;
    return pickPlanValue(plan, ["aircraftId", "aircraft", "aircraftType"]);
  });
  const pilotAirports = recentPilotSessions.flatMap((item) => {
    const plan = asArray((item as { flightPlans?: unknown }).flightPlans)[0] ?? null;
    const departure = pickPlanValue(plan, ["departureId", "departure", "origin"]);
    const arrival = pickPlanValue(plan, ["arrivalId", "arrival", "destination"]);
    return [departure, arrival].filter(Boolean);
  });
  const atcPositions = recentAtcSessions.map((item) => ({
    key: pickString((item as { callsign?: unknown }).callsign) ?? null,
    time: Number((item as { time?: unknown }).time),
  }));

  const topAircraft = countBy(pilotAircraft);
  const topAirport = countBy(pilotAirports);
  const topPosition = topByTime(atcPositions);

  const monthKey = `${lastMonthStart.getUTCFullYear()}-${String(lastMonthStart.getUTCMonth() + 1).padStart(2, "0")}`;
  const statsUserId = viewingOwnProfile ? user?.id : viewedUser?.id;
  if (statsUserId && profileVid) {
    try {
      await prisma.monthlyUserStat.upsert({
        where: { userId_monthKey: { userId: statsUserId, monthKey } },
        create: {
          userId: statsUserId,
          userVid: profileVid,
          monthKey,
          monthStart: lastMonthStart,
          monthEnd: lastMonthEnd,
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
          userVid: profileVid,
          monthStart: lastMonthStart,
          monthEnd: lastMonthEnd,
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
    } catch (error) {
      console.error("[profile] Failed to upsert monthly stats", error);
    }
  }


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

  const lastSeen =
    pickString(
      profile.lastConnection,
      profile.last_connection,
      profile.lastSeen,
      profile.last_seen,
      profile.lastLogin,
    ) || undefined;
  const greetingName = viewingOwnProfile
    ? session.user.name ?? t("title")
    : viewedUser?.name ?? profile.publicNickname ?? t("title");
  const greetingFirstName = greetingName.split(" ").filter(Boolean)[0] ?? greetingName;
  const staffLabel = profile.isSupervisor ? "SUP" : profile.isStaff ? "STAFF" : "MEMBER";
  const latestEvent = recentEvents[0] ?? null;
  const countryLabel =
    profile.country?.name ?? profile.country?.code ?? profile.countryId ?? profile.countryCode ?? t("unknown");
  const divisionLabel = profile.division?.id ?? profile.division?.code ?? profile.divisionId ?? t("unknown");
  const bookingStations = [
    { code: "LPPT", label: "LPPT | LIS" },
    { code: "LPPR", label: "LPPR | OPO" },
    { code: "LPFR", label: "LPFR | FAO" },
  ];
  const bookingStartDefault = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingEndDefault = (() => {
    const d = new Date();
    d.setHours(1, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingMaxToday = (() => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return formatInputDateTime(d);
  })();
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
        socialLinks={{
          facebookUrl: siteConfig.socialFacebookUrl,
          discordUrl: siteConfig.socialDiscordUrl,
          instagramUrl: siteConfig.socialInstagramUrl,
          xUrl: siteConfig.socialXUrl,
          forumUrl: siteConfig.socialForumUrl,
        }}
      />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <Card className="overflow-hidden p-0">
          <ProfileEventsCarousel events={upcomingEvents} locale={locale} />
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">{t("eyebrow")}</p>
            <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">Hey {greetingFirstName}</h1>
          </div>
          {viewingOwnProfile ? (
            <ProfileEditModal
              locale={locale}
              avatarName={avatarName}
              avatarUrl={avatarUrl}
              avatarColor={avatarColorKey}
              avatarOptions={AVATAR_COLOR_OPTIONS}
              updateAvatarUrlAction={updateAvatarUrlAction}
              updateAvatarColorAction={updateAvatarColorAction}
              updateStaffProfileAction={updateStaffProfileAction}
              staffBio={user?.staffBio ?? null}
              publicStaffProfile={Boolean(user?.publicStaffProfile)}
              isStaff={Boolean(profile.isStaff)}
            />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
              <UserAvatar name={avatarName} src={avatarUrl} colorKey={avatarColor} size={56} />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {viewingOwnProfile
                      ? session.user.name ?? t("title")
                      : viewedUser?.name ?? profile.publicNickname ?? t("title")}
                  </p>
                  <span className="rounded-full bg-[color:var(--primary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white">
                    {staffLabel}
                  </span>
                </div>
                <p className="text-xs text-[color:var(--text-muted)]">VID {targetVid || session.user.vid}</p>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {countryLabel} • {divisionLabel}
                </p>
              </div>
            </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
              {pilotBadgeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pilotBadgeUrl} alt="" className="h-6 w-auto" />
              ) : (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-[10px] font-semibold">
                  {pilotRating ?? "PILOT"}
                </span>
              )}
              {atcBadgeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={atcBadgeUrl} alt="" className="h-6 w-auto" />
              ) : (
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-[10px] font-semibold">
                  {atcRating ?? "ATC"}
                </span>
              )}
            </div>
          </Card>

          {liveRole === "OFFLINE" ? (
            <Card className="flex h-full flex-col overflow-hidden p-0">
              <div className="flex flex-1 flex-col justify-center bg-[color:var(--danger)] px-4 py-3 text-white">
                <p className="text-sm font-semibold">OFFLINE</p>
                <p className="text-xs text-white/80">
                  {lastSeenDisplay ? `Last connected ${lastSeenDisplay}` : "No recent session data."}
                </p>
              </div>
              <div className="grid items-center bg-[color:var(--surface-2)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x divide-y divide-[color:var(--border)]">
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
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {formatHours(pilotHoursDisplay)}
                  </p>
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
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {formatHours(atcHoursDisplay)}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">Total ATC time</p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
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
                <div className="grid h-full bg-[color:var(--surface-2)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x divide-y divide-[color:var(--border)]">
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Some stats for you to enjoy</p>
          </div>
          <Link
            href={`/${locale}/stats`}
            className="text-xs font-semibold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            see more stats
          </Link>
        </div>
        <Card className="space-y-3 p-4">
          <p className="text-xs text-[color:var(--text-muted)]">Last month</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown plane</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {topAircraft ? `${topAircraft.key} (${topAircraft.count})` : "?"}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Most flown airport</p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {topAirport ? `${topAirport.key} (${topAirport.count})` : "?"}
              </p>
            </div>
            <div className="rounded-lg bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                Most controlled position
              </p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {topPosition ? `${topPosition.key} (${formatDuration(topPosition.time)})` : "?"}
              </p>
            </div>
          </div>
        </Card>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            {profileVid ? (
            <Card className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Recent sessions</p>
                <span className="text-xs text-[color:var(--text-muted)]">{sessions.length}</span>
              </div>
              {sessions.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No recent sessions found.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="space-y-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{session.callsign}</p>
                        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                          {session.connectionType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--text-muted)]">
                        <span>{session.route ?? "Route unavailable"}</span>
                        <span>{session.aircraft ?? "Aircraft unknown"}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[color:var(--text-muted)]">
                        <span>
                          {session.startLabel}
                          {session.endLabel ? ` - ${session.endLabel}` : ""}
                        </span>
                        <span className="font-semibold text-[color:var(--text-primary)]">{session.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <div className="grid gap-4 auto-rows-fr">
            {viewingOwnProfile ? (
              <Card className="flex h-full flex-col space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">My ATC bookings</p>
                  <span className="text-xs text-[color:var(--text-muted)]">{myBookings.length}</span>
                </div>
                {myBookings.length === 0 ? (
                  <p className="text-sm text-[color:var(--text-muted)]">No bookings yet.</p>
                ) : (
                  <div className="space-y-2">
                    {myBookings.map((b) => (
                      <div
                        key={`${b.id}-${b.callsign}`}
                        className="flex items-center justify-between rounded-lg bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-[color:var(--text-primary)]">{b.callsign}</p>
                          <p className="text-xs text-[color:var(--text-muted)]">
                            {b.start ? formatDateTimeLocal(b.start) : "?"}{" "}
                            {b.end ? `- ${formatDateTimeLocal(b.end)}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-2">
                  <BookStationModal
                    action={createAtcBookingAction}
                    stations={bookingStations}
                    bookingStartDefault={bookingStartDefault}
                    bookingEndDefault={bookingEndDefault}
                    bookingMaxToday={bookingMaxToday}
                  />
                </div>
              </Card>
            ) : null}

            <Card className="flex h-full flex-col space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Latest event</p>
              </div>
              {latestEvent ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{latestEvent.event.title}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">{formatDateTime(latestEvent.event.startTime)}</p>
                  <Link
                    href={`/${locale}/events/${latestEvent.event.slug}`}
                    className="text-xs font-semibold text-[color:var(--primary)]"
                  >
                    View event
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-muted)]">No events yet.</p>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Give feedback</p>
          <div className="grid gap-4 md:grid-cols-2">
            {viewingOwnProfile ? (
              <Card className="flex h-full flex-col space-y-3 p-4">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">Testimonial</p>
                <p className="text-sm text-[color:var(--text-muted)]">
                  Share a short testimonial. It will be reviewed by staff before publishing.
                </p>
                <form id="testimonial-form" action={submitTestimonialAction} className="space-y-3">
                  <input type="hidden" name="locale" value={locale} />
                  <label className="space-y-1 text-sm">
                    <span className="text-[color:var(--text-muted)]">Name</span>
                    <input
                      name="name"
                      defaultValue={user?.name ?? ""}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[color:var(--text-muted)]">Role</span>
                    <input
                      name="role"
                      placeholder="Pilot, ATC, Student"
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[color:var(--text-muted)]">Message</span>
                    <textarea
                      name="content"
                      rows={4}
                      className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                </form>
                <div className="mt-auto flex justify-end">
                  <Button size="sm" type="submit" form="testimonial-form">
                    Submit
                  </Button>
                </div>
                {user?.testimonials?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      Recent submissions
                    </p>
                    {user.testimonials.map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-[color:var(--surface-2)] p-2 text-xs">
                        <p className="text-[color:var(--text-primary)]">{entry.content}</p>
                        <p className="text-[color:var(--text-muted)]">Status: {entry.status}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}

            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{tf("title")}</p>
              <p className="text-sm text-[color:var(--text-muted)]">{tf("description")}</p>
              <FeedbackForm
                initialName={session.user?.name ?? ""}
                initialEmail={user?.email ?? ""}
                initialVid={session.user?.vid ?? ""}
                labels={{
                  name: tf("name"),
                  email: tf("email"),
                  vid: tf("vid"),
                  title: tf("titleLabel"),
                  message: tf("message"),
                  submit: tf("submit"),
                  note: tf("note"),
                }}
              />
            </Card>
          </div>
        </div>
      </main>
      <Footer
        locale={locale}
        items={footerItems}
        allowedPermissions={Array.from(staffPermissions)}
        isAdmin={session.user.role === "ADMIN"}
        role={session.user.role}
        brandName={siteConfig.divisionName}
        logoUrl={siteConfig.logoCompactUrl || siteConfig.logoFullUrl}
        logoDarkUrl={siteConfig.logoCompactDarkUrl || siteConfig.logoFullDarkUrl || undefined}
        tagline={siteConfig.footerTagline}
        countries={siteConfig.countries}
        supportEmail={siteConfig.supportEmail}
        websiteUrl={siteConfig.websiteUrl}
      />
    </div>
  );
}

