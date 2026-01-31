/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { getSiteConfig } from "@/lib/site-config";

type Props = {
  params: Promise<{ locale: Locale }>;
};

type StaffMember = {
  id: string;
  name: string;
  vid: string;
  photoUrl: string | null;
  avatarColor: string | null;
  bio: string | null;
  hasAccount: boolean;
  profileHref: string | null;
  pilotRating?: string | null;
  atcRating?: string | null;
  pilotHours?: number | null;
  atcHours?: number | null;
  pilotBadgeUrl?: string | null;
  atcBadgeUrl?: string | null;
  isOnline?: boolean;
};

type PositionGroup = {
  id: string;
  name: string;
  description: string | null;
  members: StaffMember[];
};

type TeamGroup = {
  id: string;
  name: string;
  description: string | null;
  positions: PositionGroup[];
};

type DepartmentGroup = {
  id: string;
  name: string;
  description: string | null;
  teams: TeamGroup[];
};

const isExecutiveDepartment = (dept: DepartmentGroup) =>
  dept.id.toUpperCase() === "EXEC" || dept.name.toLowerCase().includes("executive");
const isDirectorDepartment = (dept: DepartmentGroup) => dept.name.toLowerCase().includes("director");

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
};

const unwrapProfile = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") return null;
  const withKey = payload as { data?: unknown; result?: unknown; user?: unknown };
  const data = withKey.data;
  const result = withKey.result;
  const user = withKey.user;
  if (data && typeof data === "object" && "user" in (data as { user?: unknown })) {
    return ((data as { user?: unknown }).user ?? null) as Record<string, unknown> | null;
  }
  if (data && typeof data === "object") return data as Record<string, unknown>;
  if (result && typeof result === "object" && "user" in (result as { user?: unknown })) {
    return ((result as { user?: unknown }).user ?? null) as Record<string, unknown> | null;
  }
  if (result && typeof result === "object") return result as Record<string, unknown>;
  if (user && typeof user === "object") return user as Record<string, unknown>;
  return payload as Record<string, unknown>;
};

const getIvaoDisplayName = (payload: unknown): string | undefined => {
  const profile = unwrapProfile(payload);
  if (!profile) return undefined;
  const firstName = pickString(
    profile.firstName,
    profile.first_name,
    profile.firstname,
    profile.given_name,
    profile.givenName,
  );
  const lastName = pickString(
    profile.lastName,
    profile.last_name,
    profile.lastname,
    profile.family_name,
    profile.familyName,
  );
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const resolved =
    fullName ||
    pickString(
      profile.publicNickname,
      profile.public_nickname,
      profile.nickname,
      profile.name,
      profile.fullName,
      profile.full_name,
    );
  if (resolved && /^user\s+\d+$/i.test(resolved.trim())) return undefined;
  return resolved;
};

const getIvaoFirstLastName = (payload: unknown): string | undefined => {
  const profile = unwrapProfile(payload);
  if (!profile) return undefined;
  const firstName = pickString(
    profile.firstName,
    profile.first_name,
    profile.firstname,
    profile.given_name,
    profile.givenName,
  );
  const lastName = pickString(
    profile.lastName,
    profile.last_name,
    profile.lastname,
    profile.family_name,
    profile.familyName,
  );
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (!fullName || /^user\s+\d+$/i.test(fullName)) return undefined;
  return fullName;
};

const pickRating = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    const v =
      (value as { shortName?: string }).shortName ??
      (value as { short?: string }).short ??
      (value as { code?: string }).code ??
      (value as { name?: string }).name ??
      (value as { id?: string | number }).id;
    if (typeof v === "number") return String(v);
    return typeof v === "string" && v.trim() ? v : undefined;
  }
  return undefined;
};

const normalizeHoursValue = (value: unknown): number => {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return 0;
  if (value <= 0) return 0;

  const asMinutes = value / 60;
  const asSeconds = value / 3600;

  if (value > 100000) {
    if (asMinutes <= 20000) return asMinutes;
    if (asSeconds <= 20000) return asSeconds;
  }

  if (value > 600) {
    const minutesMatch = Math.abs(value - Math.round(asMinutes) * 60) <= 2;
    if (minutesMatch || asMinutes <= 20000) return asMinutes;
  }

  return value;
};

const formatHours = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const adjHours = hours + (minutes === 60 ? 1 : 0);
  const adjMinutes = minutes === 60 ? 0 : minutes;
  return adjMinutes > 0 ? `${adjHours}h ${adjMinutes}m` : `${adjHours}h`;
};

export default async function StaffPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff" });
  const session = await auth();
  const showPrivate = Boolean(session?.user);
  const ivaoBearer = session?.user?.ivaoAccessToken ?? null;
  const siteConfig = await getSiteConfig();

  const assignments = await prisma.ivaoStaffAssignment.findMany({
    where: { active: true },
    include: {
      position: { include: { team: { include: { department: true } } } },
      user: {
        select: {
          id: true,
          name: true,
          vid: true,
          staffBio: true,
          publicStaffProfile: true,
          avatarUrl: true,
          avatarColor: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const visibleAssignments = assignments;

  const uniqueVids = Array.from(
    new Set(
      visibleAssignments
        .map((assignment) => assignment.user?.vid ?? assignment.userVid)
        .filter((vid): vid is string => typeof vid === "string" && vid.trim().length > 0),
    ),
  );

  const fetchWhazzup = unstable_cache(() => ivaoClient.getWhazzup(), ["public-staff-whazzup"], { revalidate: 60 });
  const whazzup = await fetchWhazzup();
  const whazzupClients = whazzup && typeof whazzup === "object"
    ? (whazzup as { clients?: { pilots?: unknown; atc?: unknown; atcs?: unknown; controllers?: unknown } }).clients
    : undefined;
  const whazzupPilots = Array.isArray(whazzupClients?.pilots)
    ? (whazzupClients?.pilots as Record<string, unknown>[])
    : [];
  const whazzupAtc = Array.isArray(whazzupClients?.atc)
    ? (whazzupClients?.atc as Record<string, unknown>[])
    : Array.isArray(whazzupClients?.atcs)
      ? (whazzupClients?.atcs as Record<string, unknown>[])
      : Array.isArray(whazzupClients?.controllers)
        ? (whazzupClients?.controllers as Record<string, unknown>[])
        : [];
  const onlineVids = new Set(
    [...whazzupPilots, ...whazzupAtc]
      .map((entry) =>
        pickString(
          entry.vid,
          entry.userId,
          (entry as { user_id?: unknown }).user_id,
          entry.id,
          (entry as { cid?: unknown }).cid,
          (entry as { clientId?: unknown }).clientId,
          (entry as { client_id?: unknown }).client_id,
          entry.sub,
        ),
      )
      .filter((vid): vid is string => typeof vid === "string" && vid.trim().length > 0),
  );

  const fetchIvaoProfile = (vid: string) =>
    unstable_cache(
      async () => {
        if (ivaoBearer) {
          try {
            return await ivaoClient.getUserProfile(vid, ivaoBearer, { silent: true });
          } catch {
            return ivaoClient.getUserProfile(vid);
          }
        }
        return ivaoClient.getUserProfile(vid);
      },
      [`staff-ivao-user-${vid}`],
      { revalidate: 3600 },
    )();

  const ivaoProfiles = await Promise.all(
    uniqueVids.map(async (vid) => {
      try {
        const data = await fetchIvaoProfile(vid);
        return [vid, data] as const;
      } catch {
        return [vid, null] as const;
      }
    }),
  );

  const ivaoProfileMap = new Map(ivaoProfiles);
  const departmentMap = new Map<string, DepartmentGroup>();

  visibleAssignments.forEach((assignment) => {
    const department = assignment.position.team?.department;
    const team = assignment.position.team;
    const departmentId = department?.id ?? "other";
    const departmentName = department?.name ?? "Other";
    const departmentDesc = department?.description ?? null;

    if (!departmentMap.has(departmentId)) {
      departmentMap.set(departmentId, {
        id: departmentId,
        name: departmentName,
        description: departmentDesc,
        teams: [],
      });
    }

    const dept = departmentMap.get(departmentId)!;
    const teamId = team?.id ?? "other-team";
    let teamGroup = dept.teams.find((item) => item.id === teamId);
    if (!teamGroup) {
      teamGroup = {
        id: teamId,
        name: team?.name ?? "Other",
        description: team?.description ?? null,
        positions: [],
      };
      dept.teams.push(teamGroup);
    }

    const positionId = assignment.positionId;
    let positionGroup = teamGroup.positions.find((pos) => pos.id === positionId);
    if (!positionGroup) {
      positionGroup = {
        id: positionId,
        name: assignment.position.name,
        description: assignment.position.description ?? null,
        members: [],
      };
      teamGroup.positions.push(positionGroup);
    }

    const memberVid = assignment.user?.vid ?? assignment.userVid;
    const ivaoProfile = memberVid ? ivaoProfileMap.get(memberVid) : null;
    const isPublicProfile = Boolean(assignment.user?.publicStaffProfile);
    const canShowPrivate = showPrivate || isPublicProfile;
    const ivaoName = showPrivate
      ? getIvaoFirstLastName(ivaoProfile) ?? getIvaoDisplayName(ivaoProfile)
      : undefined;
    const publicName = isPublicProfile ? getIvaoFirstLastName(ivaoProfile) : undefined;
    const rawName = ivaoName ?? publicName ?? (canShowPrivate ? assignment.user?.name ?? "" : "");
    const displayName =
      /^\d+$/.test(rawName.trim()) || rawName.trim() === assignment.userVid
        ? "Member"
        : rawName.trim() || "Member";
    const photoUrl = canShowPrivate ? assignment.user?.avatarUrl ?? null : null;
    const avatarColor = canShowPrivate ? assignment.user?.avatarColor ?? null : null;
    const bio = canShowPrivate ? assignment.user?.staffBio ?? null : null;
    const hasAccount = Boolean(assignment.user?.id);
    const profileHref = hasAccount ? `/${locale}/profile?vid=${memberVid}` : null;

    const rating = ivaoProfile
      ? (ivaoProfile as { rating?: Record<string, unknown>; ratings?: Record<string, unknown> }).rating
      : undefined;
    const ratings = ivaoProfile ? (ivaoProfile as { ratings?: Record<string, unknown> }).ratings : undefined;
    const pilotRating =
      pickRating((rating as { pilotRating?: unknown })?.pilotRating) ??
      pickRating((rating as { pilot?: unknown })?.pilot) ??
      pickRating(ratings?.pilot);
    const atcRating =
      pickRating((rating as { atcRating?: unknown })?.atcRating) ??
      pickRating((rating as { atc?: unknown })?.atc) ??
      pickRating(ratings?.atc);
    const pilotRatingId = pickString(
      (rating as { pilotRating?: { id?: unknown } })?.pilotRating?.id,
      (ivaoProfile as { pilot_rating?: unknown })?.pilot_rating,
      (ivaoProfile as { pilotRating?: unknown })?.pilotRating,
    );
    const pilotRatingLabel = pickString(
      (rating as { pilotRating?: { shortName?: unknown; name?: unknown } })?.pilotRating?.shortName,
      (rating as { pilotRating?: { name?: unknown } })?.pilotRating?.name,
      pilotRating,
    );
    const atcRatingId = pickString(
      (rating as { atcRating?: { id?: unknown } })?.atcRating?.id,
      (ivaoProfile as { atc_rating?: unknown })?.atc_rating,
      (ivaoProfile as { atcRating?: unknown })?.atcRating,
    );
    const atcRatingLabel = pickString(
      (rating as { atcRating?: { shortName?: unknown; name?: unknown } })?.atcRating?.shortName,
      (rating as { atcRating?: { name?: unknown } })?.atcRating?.name,
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

    const hoursArray =
      ivaoProfile && Array.isArray((ivaoProfile as { hours?: unknown }).hours)
        ? ((ivaoProfile as { hours?: { type?: string; hours?: number }[] }).hours ?? [])
        : [];
    const getHours = (label: string) =>
      hoursArray.find(
        (entry) =>
          typeof entry?.type === "string" &&
          entry.type.toLowerCase() === label.toLowerCase() &&
          typeof entry.hours === "number",
      )?.hours ?? 0;
    const pilotHours = normalizeHoursValue(getHours("pilot"));
    const atcHours = normalizeHoursValue(getHours("atc"));

    positionGroup.members.push({
      id: assignment.id,
      name: displayName,
      vid: memberVid,
      photoUrl,
      avatarColor,
      bio,
      hasAccount,
      profileHref,
      pilotRating: pilotRating ?? null,
      atcRating: atcRating ?? null,
      pilotHours: pilotHours || null,
      atcHours: atcHours || null,
      pilotBadgeUrl: pilotBadgeUrl || null,
      atcBadgeUrl: atcBadgeUrl || null,
      isOnline: memberVid ? onlineVids.has(memberVid) : false,
    });
  });

  const departments = Array.from(departmentMap.values()).filter((dept) =>
    dept.teams.some((team) => team.positions.some((pos) => pos.members.length > 0)),
  );

  departments.sort((a, b) => {
    const aExec = isExecutiveDepartment(a);
    const bExec = isExecutiveDepartment(b);
    if (aExec !== bExec) return aExec ? -1 : 1;
    const aDir = isDirectorDepartment(a);
    const bDir = isDirectorDepartment(b);
    if (aDir !== bDir) return aDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const isAssistantDirector = (name: string) => name.toLowerCase().includes("assistant director");
  const isDirector = (name: string) =>
    name.toLowerCase().includes("director") && !isAssistantDirector(name);
  const isCoordinator = (name: string) =>
    name.toLowerCase().includes("coordinator") && !name.toLowerCase().includes("assistant coordinator");
  const isAssistantCoordinator = (name: string) => name.toLowerCase().includes("assistant coordinator");
  const isAdvisor = (name: string) =>
    name.toLowerCase().includes("advisor") || name.toLowerCase().includes("adviser");
  const isAssistantWebmaster = (name: string) =>
    name.toLowerCase().includes("assistant") && name.toLowerCase().includes("webmaster");
  const isWebmaster = (name: string) =>
    name.toLowerCase().includes("webmaster") && !isAssistantWebmaster(name);

  departments.forEach((dept) => {
    dept.teams.sort((a, b) => a.name.localeCompare(b.name));
    dept.teams.forEach((team) => {
      team.positions.sort((a, b) => a.name.localeCompare(b.name));
    });
  });

  const orderPositions = (positions: PositionGroup[], exec: boolean) => {
    const rankPosition = (pos: PositionGroup) => {
      if (isWebmaster(pos.name)) return -3;
      if (isAssistantWebmaster(pos.name)) return -2;
      if (isAdvisor(pos.name)) return -1;
      return 0;
    };
    const sortedByRank = (list: PositionGroup[]) =>
      list.slice().sort((a, b) => rankPosition(a) - rankPosition(b) || a.name.localeCompare(b.name));

    if (exec) {
      const directors = positions.filter((pos) => isDirector(pos.name));
      const assistantDirectors = positions.filter((pos) => isAssistantDirector(pos.name));
      const advisors = positions.filter((pos) => isAdvisor(pos.name));
      const others = positions.filter(
        (pos) =>
          !isDirector(pos.name) &&
          !isAssistantDirector(pos.name) &&
          !isAdvisor(pos.name),
      );
      return [
        ...sortedByRank(directors),
        ...sortedByRank(assistantDirectors),
        ...sortedByRank(others),
        ...sortedByRank(advisors),
      ];
    }
    const coordinators = positions.filter((pos) => isCoordinator(pos.name));
    const assistantCoordinators = positions.filter((pos) => isAssistantCoordinator(pos.name));
    const advisors = positions.filter((pos) => isAdvisor(pos.name));
    const others = positions.filter(
      (pos) =>
        !isCoordinator(pos.name) &&
        !isAssistantCoordinator(pos.name) &&
        !isAdvisor(pos.name),
    );
    return [
      ...sortedByRank(coordinators),
      ...sortedByRank(assistantCoordinators),
      ...sortedByRank(others),
      ...sortedByRank(advisors),
    ];
  };

  const buildEntries = (teams: TeamGroup[], exec: boolean) =>
    teams.flatMap((team) =>
      orderPositions(team.positions, exec).flatMap((position) =>
        position.members.map((member) => ({
          member,
          position,
          teamName: team.name,
        })),
      ),
    );

  return (
    <main className="min-h-screen bg-transparent px-3 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        {departments.length === 0 ? (
          <Card className="border-0 p-4 shadow-none">
            <p className="text-sm text-[color:var(--text-muted)]">{t("empty")}</p>
          </Card>
        ) : (
          departments.map((department) => {
            const exec = isExecutiveDepartment(department);
            const entries = buildEntries(department.teams, exec);
            const onlineCount = entries.filter((entry) => entry.member.isOnline).length;

            const renderMemberCard = (member: StaffMember, positionName: string, teamName: string) => {
              const avatar = (
                <UserAvatar
                  name={member.name}
                  src={member.photoUrl}
                  colorKey={member.avatarColor}
                  size={56}
                  className="text-base font-semibold"
                />
              );

              const hasPilotHours = typeof member.pilotHours === "number" && member.pilotHours > 0;
              const hasAtcHours = typeof member.atcHours === "number" && member.atcHours > 0;
              const showPilot = hasPilotHours;
              const showAtc = hasAtcHours;
              const badgeRow = showPilot || showAtc;

              const card = (
                <article className="group relative flex h-full flex-col justify-between rounded-[28px] bg-white px-5 py-4 shadow-[0_18px_36px_-28px_rgba(13,44,153,0.4)] transition-transform duration-200 hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="rounded-full bg-white p-1 shadow-[0_10px_18px_-14px_rgba(13,44,153,0.4)]">
                        {avatar}
                      </div>
                      <span
                        className={`absolute bottom-1 right-1 h-3 w-3 rounded-full ring-2 ring-white ${
                          member.isOnline ? "bg-[color:#2EC662]" : "bg-[color:#B6BCC8]"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-base font-semibold text-[color:var(--text-primary)]">{member.name}</p>
                      <p className="text-sm font-semibold text-[color:var(--primary)]">{positionName}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">{teamName}</p>
                    </div>
                  </div>
                  {member.bio ? (
                    <p className="mt-3 text-sm text-[color:var(--text-muted)]">{member.bio}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
                    {member.isOnline ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[color:rgba(46,198,98,0.16)] px-3 py-1 text-[color:rgba(22,101,52,1)]">
                        <span className="h-2 w-2 rounded-full bg-[color:#2EC662]" />
                        Online
                      </span>
                    ) : null}
                    {badgeRow ? <span className="h-4 w-px bg-[color:var(--border)]" /> : null}
                    {badgeRow ? (
                      <div className="flex flex-wrap gap-2">
                        {showPilot ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-2)] px-2 py-0.5">
                            {member.pilotBadgeUrl ? (
                              <img src={member.pilotBadgeUrl} alt="" className="h-5 w-auto" />
                            ) : (
                              <span className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                                {member.pilotRating ?? "PILOT"}
                              </span>
                            )}
                            {formatHours(member.pilotHours) ? <span>{formatHours(member.pilotHours)}</span> : null}
                          </span>
                        ) : null}
                        {showAtc ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--surface-2)] px-2 py-0.5">
                            {member.atcBadgeUrl ? (
                              <img src={member.atcBadgeUrl} alt="" className="h-5 w-auto" />
                            ) : (
                              <span className="text-[10px] font-semibold text-[color:var(--text-muted)]">
                                {member.atcRating ?? "ATC"}
                              </span>
                            )}
                            {formatHours(member.atcHours) ? <span>{formatHours(member.atcHours)}</span> : null}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              );

              return member.hasAccount && member.profileHref ? (
                <Link key={member.id} href={member.profileHref} className="block">
                  {card}
                </Link>
              ) : (
                <div key={member.id}>{card}</div>
              );
            };

            return (
              <section
                key={department.id}
                className="relative overflow-hidden rounded-[40px] bg-[color:var(--surface)] px-6 py-10 shadow-[var(--shadow-soft)] sm:px-10"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-80"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 12% 18%, rgba(13,44,153,0.12), transparent 45%), radial-gradient(circle at 84% 12%, rgba(126,162,214,0.2), transparent 45%), radial-gradient(rgba(13,44,153,0.12) 1px, transparent 1px)",
                    backgroundSize: "auto, auto, 26px 26px",
                    backgroundPosition: "center, center, 0 0",
                  }}
                />
                <div className="relative space-y-8">
                  <div className="space-y-2 text-center">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                      {exec ? "Executive" : "Division staff"}
                    </p>
                    <h2 className="text-3xl font-semibold text-[color:var(--text-primary)] sm:text-4xl">
                      {department.name} Staff
                    </h2>
                    {department.description && department.description !== "@TODO" ? (
                      <p className="text-sm text-[color:var(--text-muted)]">{department.description}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map((entry) =>
                      renderMemberCard(entry.member, entry.position.name, entry.teamName),
                    )}
                  </div>

                  <div className="flex justify-center">
                    <div className="rounded-full bg-[color:var(--surface-2)] px-5 py-2 text-xs text-[color:var(--text-muted)] shadow-[var(--shadow-soft)]">
                      Active Members: {onlineCount}
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}
