import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

type StaffMember = {
  id: string;
  name: string;
  vid: string;
  photoUrl: string | null;
  bio: string | null;
};

type StaffGroup = {
  id: string;
  name: string;
  description: string | null;
  departmentName: string | null;
  members: StaffMember[];
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IV";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "IV";
};

export default async function StaffPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "staff" });
  const session = await auth();
  const showPrivate = Boolean(session?.user);

  const assignments = await prisma.staffAssignment.findMany({
    where: { active: true },
    include: {
      position: { include: { department: true } },
      user: {
        select: {
          name: true,
          vid: true,
          staffPhotoUrl: true,
          staffBio: true,
          publicStaffProfile: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const sortedAssignments = assignments
    .filter((assignment) => showPrivate || assignment.user?.publicStaffProfile)
    .sort((a, b) => a.position.name.localeCompare(b.position.name));

  const groups = new Map<string, StaffGroup>();
  sortedAssignments.forEach((assignment) => {
    const group = groups.get(assignment.positionId) ?? {
      id: assignment.positionId,
      name: assignment.position.name,
      description: assignment.position.description ?? null,
      departmentName: assignment.position.department?.name ?? null,
      members: [],
    };

    const displayName = assignment.user?.name ?? `VID ${assignment.userVid}`;
    const memberVid = assignment.user?.vid ?? assignment.userVid;
    const photoUrl = assignment.user?.staffPhotoUrl ?? assignment.user?.avatarUrl ?? null;
    const bio = assignment.user?.staffBio ?? null;
    if (!showPrivate && !assignment.user?.publicStaffProfile) return;

    group.members.push({
      id: assignment.id,
      name: displayName,
      vid: memberVid,
      photoUrl,
      bio,
    });
    groups.set(assignment.positionId, group);
  });

  const groupList = Array.from(groups.values()).filter((group) => group.members.length > 0);

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
      <SectionHeader
        title={t("title")}
        description={t("description")}
        action={<p className="text-xs text-[color:var(--text-muted)]">{showPrivate ? t("memberNote") : t("publicNote")}</p>}
      />

      {groupList.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-[color:var(--text-muted)]">{t("empty")}</p>
        </Card>
      ) : (
        groupList.map((group) => (
          <Card key={group.id} className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{group.name}</p>
                {group.description ? (
                  <p className="text-xs text-[color:var(--text-muted)]">{group.description}</p>
                ) : null}
                {group.departmentName ? (
                  <p className="text-xs text-[color:var(--text-muted)]">Department: {group.departmentName}</p>
                ) : null}
              </div>
              <span className="text-xs text-[color:var(--text-muted)]">{group.members.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
                >
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name}
                      className="h-12 w-12 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-xs font-semibold text-[color:var(--text-primary)]">
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{member.name}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">VID {member.vid}</p>
                    {member.bio ? (
                      <p className="text-xs text-[color:var(--text-muted)]">{member.bio}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
      </div>
    </main>
  );
}