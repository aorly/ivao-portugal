import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConnectNavigraphButton } from "@/components/auth/connect-navigraph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { deleteAtcBookingAction, updateStaffProfileAction } from "./actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  const th = await getTranslations({ locale, namespace: "home" });
  const session = await auth();

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
          <Link href={`/${locale}/login`}>
            <Button>{th("ctaJoin")}</Button>
          </Link>
        </Card>
      </main>
    );
  }

  let ivaoProfileRaw: unknown = null;
  let ivaoError: string | null = null;
  let ivaoBearer: string | null = null;

  const [user, ivaAccount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        trainingSessions: { orderBy: { dateTime: "desc" }, take: 5 },
        trainingRequests: { orderBy: { createdAt: "desc" }, take: 5 },
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
  ]);

  const isFuture = (epoch?: number | null) => {
    if (!epoch) return false;
    const now = Math.floor(Date.now() / 1000);
    return epoch > now + 60;
  };

  ivaoBearer = ivaAccount?.access_token && isFuture(ivaAccount.expires_at) ? ivaAccount.access_token : null;
  const isUnauthorized = (message: string) =>
    message.includes("401") || message.toLowerCase().includes("unauthorized");

  // Try user token on /me, then /{vid}, then API-key fallback.
  const tryFetch = async (): Promise<void> => {
    const attempts: Array<() => Promise<unknown>> = [];
    if (ivaoBearer) {
      attempts.push(() => ivaoClient.getCurrentUser(ivaoBearer ?? undefined));
      attempts.push(() => ivaoClient.getUserProfile(session.user.vid, ivaoBearer ?? undefined));
    }
    attempts.push(() => ivaoClient.getUserProfile(session.user.vid));

    for (const attempt of attempts) {
      try {
        ivaoProfileRaw = await attempt();
        ivaoError = null;
        return;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        ivaoError = msg;
        if (!isUnauthorized(msg.toLowerCase())) {
          return;
        }
        // unauthorized: continue to next attempt
      }
    }
  };

  await tryFetch();
  const bookingsRaw = session.user.ivaoAccessToken
    ? await ivaoClient.getAtcBookings(session.user.ivaoAccessToken).catch(() => [])
    : [];
  const myBookings = bookingsRaw
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
    division?: { name?: string; id?: string; code?: string };
    divisionId?: string;
    countryId?: string;
    country?: { id?: string; code?: string; name?: string };
    countryCode?: string;
    rating?: {
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
    stats?: { pilot?: { hours?: number }; atc?: { hours?: number }; totalHours?: number };
    pilotHours?: number;
    pilot_hours?: number;
    atcHours?: number;
    atc_hours?: number;
    hours?: { type?: string; hours?: number }[];
    hoursTotal?: number;
    lastConnection?: string;
    last_connection?: string;
    lastSeen?: string;
    last_seen?: string;
    lastLogin?: string;
    gcas?: { divisionId?: string }[];
    userStaffPositions?: {
      id?: string;
      divisionId?: string;
      staffPosition?: { name?: string; type?: string; departmentTeam?: { name?: string; department?: { name?: string } } };
      description?: string;
    }[];
    ownedVirtualAirlines?: { id?: string | number; name?: string; divisionId?: string; airlineId?: string }[];
    profile?: { city?: string; state?: string; birthday?: string };
  };

  const upcomingSessions = user?.trainingSessions ?? [];
  const recentRequests = user?.trainingRequests ?? [];
  const recentEvents = user?.registrations ?? [];

  const pickString = (...candidates: unknown[]): string | undefined => {
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
      if (typeof c === "number") return String(c);
    }
    return undefined;
  };

  const pickRating = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    if (typeof value === "object") {
      const v =
        (value as { short?: string }).short ??
        (value as { shortName?: string }).shortName ??
        (value as { long?: string }).long ??
        (value as { code?: string }).code ??
        (value as { name?: string }).name ??
        (value as { id?: string | number }).id;
      if (typeof v === "number") return String(v);
      return typeof v === "string" && v.trim() ? v : undefined;
    }
    return undefined;
  };

  const asArray = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const obj = value as { data?: unknown; result?: unknown; items?: unknown };
      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.result)) return obj.result;
      if (Array.isArray(obj.items)) return obj.items;
    }
    return [];
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

  const hasHours =
    Number.isFinite(totalHours) || Number.isFinite(pilotHours) || Number.isFinite(atcHours);
  const totalHoursDisplay =
    Number.isFinite(totalHours) && typeof totalHours === "number"
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

  const virtualAirlines = Array.isArray(profile.ownedVirtualAirlines)
    ? profile.ownedVirtualAirlines
        .map((va) => ({
          id: String(va.id ?? va.airlineId ?? va.name ?? ""),
          name: va.name ?? va.airlineId ?? "",
          division: va.divisionId ?? profile.division?.code ?? "",
        }))
        .filter((va) => va.name)
    : [];

  const gcaDivisions = Array.isArray(profile.gcas)
    ? profile.gcas
        .map((g) => g.divisionId)
        .filter((val): val is string => typeof val === "string" && val.trim().length > 0)
    : [];

  const locationParts = [
    profile.profile?.city,
    profile.profile?.state,
    profile.country?.name ?? profile.country?.code ?? division,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
  const birthday = profile.profile?.birthday;

  if (ivaoError) {
    // eslint-disable-next-line no-console
    console.error("[profile] IVAO profile fetch failed", { ivaoError, hasIvaoAuthIssue, ivaoBearer: Boolean(ivaoBearer) });
  }

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[color:var(--text-muted)]">{session.user.vid}</p>
            <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
              {session.user.name ?? t("title")}
            </h2>
            <p className="text-sm text-[color:var(--text-muted)]">
              {t("roleLabel")} {session.user.role ?? "USER"}
            </p>
          </div>
          <ConnectNavigraphButton
            label={session.user.navigraphId ? t("navigraphConnected") : t("navigraphConnect")}
            disabled={Boolean(session.user.navigraphId)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/training`}>
            <Button size="sm">{th("ctaTraining")}</Button>
          </Link>
          <Link href={`/${locale}/events`}>
            <Button size="sm" variant="secondary">
              {th("ctaEvents")}
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("ivaoProfile")}</p>
        {ivaoProfile ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {t("division")}
              </p>
              <p className="text-sm text-[color:var(--text-primary)]">{division}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {t("pilotRating")}
              </p>
              <p className="text-sm text-[color:var(--text-primary)]">{pilotRating ?? t("unknown")}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {t("atcRating")}
              </p>
              <p className="text-sm text-[color:var(--text-primary)]">{atcRating ?? t("unknown")}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {t("hours")}
              </p>
              <p className="text-sm text-[color:var(--text-primary)]">
                {hasHours ? (
                  <>
                    {formatHours(totalHoursDisplay)}{" "}
                    <span className="text-[color:var(--text-muted)]">
                      ({formatHours(pilotHoursDisplay)} pilot / {formatHours(atcHoursDisplay)} ATC)
                    </span>
                  </>
                ) : (
                  t("unknown")
                )}
              </p>
            </div>
            {lastSeen ? (
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                  {t("lastSeen")}
                </p>
                <p className="text-sm text-[color:var(--text-primary)]">{lastSeen}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
            <p className="text-sm text-[color:var(--text-muted)]">
              {hasIvaoAuthIssue ? t("ivaoAuthRequired") : t("ivaoUnavailable")}
            </p>
            {ivaoError ? (
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">IVAO: {ivaoError}</p>
            ) : null}
          </div>
        )}
      </Card>

      {ivaoProfile && (
        <div className="grid gap-4 md:grid-cols-2">
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

          <Card className="space-y-3 p-4">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("virtualAirlinesTitle")}</p>
            {virtualAirlines.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {virtualAirlines.map((va) => (
                  <span
                    key={va.id}
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-xs text-[color:var(--text-primary)]"
                  >
                    {va.name} {va.division ? `| ${va.division}` : ""}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
            )}
            {gcaDivisions.length > 0 ? (
              <p className="text-xs text-[color:var(--text-muted)]">
                {t("gcaTitle")}: {gcaDivisions.join(", ")}
              </p>
            ) : null}
          </Card>
        </div>
      )}

        {ivaoProfile && staffPositions.length > 0 ? (
          <Card className="space-y-3 p-4">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("staffRolesTitle")}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {staffPositions.map((pos) => (
                <div
                  key={pos.id + pos.name}
                  className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-sm"
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
                  className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                >
                  <input type="hidden" name="bookingId" value={String(b.id ?? "")} />
                  <div className="space-y-1">
                    <p className="font-semibold text-[color:var(--text-primary)]">{b.callsign}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {b.start ? formatDateTimeLocal(b.start) : "—"} {b.end ? `→ ${formatDateTimeLocal(b.end)}` : ""}
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("training")}</p>
          {upcomingSessions.length ? (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {upcomingSessions.map((s) => (
                <li key={s.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                  <p className="text-[color:var(--text-primary)]">{s.type}</p>
                  <p>{formatDateTime(s.dateTime)}</p>
                  {s.notes ? <p className="text-xs text-[color:var(--text-muted)]">{s.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
          )}
        </Card>

        <Card className="space-y-2 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("trainingRequests")}</p>
          {recentRequests.length ? (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {recentRequests.map((r) => (
                <li key={r.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                  <p className="text-[color:var(--text-primary)]">{r.type}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{r.status}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
          )}
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("activity")}</p>
        {recentEvents.length ? (
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {recentEvents.map((reg) => (
              <li key={reg.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2">
                <p className="text-[color:var(--text-primary)]">{reg.event.title}</p>
                <p className="text-xs">{formatDateTime(reg.event.startTime)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("linkedAccounts")}</p>
        <div className="flex flex-wrap gap-3 text-sm text-[color:var(--text-muted)]">
          <span className="rounded-full bg-[color:var(--surface-3)] px-3 py-1">
            {t("navigraph")}: {session.user.navigraphId ? t("linked") : t("notLinked")}
          </span>
          <span className="rounded-full bg-[color:var(--surface-3)] px-3 py-1">
            {t("discord")}: {user?.discordId ? t("linked") : t("notLinked")}
          </span>
        </div>
      </Card>

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
    </main>
  );
}
