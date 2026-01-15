/* eslint-disable @next/next/no-img-element */
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission, STAFF_PERMISSIONS } from "@/lib/staff";
import { StaffIvaoSync } from "@/components/admin/staff-ivao-sync";
import { syncStaffFromIvaoInternal, syncStaffFromIvao } from "./actions";
import { updateUserAccessByVid } from "../users/actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IV";
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "IV"
  );
};

export default async function AdminStaffPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const syncResult = await syncStaffFromIvaoInternal(null);

  const positions = await prisma.ivaoStaffPosition.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      team: { include: { department: true } },
      assignments: {
        where: { active: true },
        include: {
          user: {
            select: {
              name: true,
              vid: true,
              staffPhotoUrl: true,
              avatarUrl: true,
              staffBio: true,
              publicStaffProfile: true,
            },
          },
        },
      },
    },
  });

  const departmentMap = new Map<string, {
    id: string;
    name: string;
    description: string | null;
    teams: Map<string, {
      id: string;
      name: string;
      description: string | null;
      positions: typeof positions;
    }>;
  }>();

  const ensureDepartment = (id: string, name: string, description: string | null) => {
    if (!departmentMap.has(id)) {
      departmentMap.set(id, { id, name, description, teams: new Map() });
    }
    return departmentMap.get(id)!;
  };

  positions.forEach((position) => {
    const department = position.team?.department;
    const departmentId = department?.id ?? "other";
    const departmentName = department?.name ?? "Other";
    const departmentDesc = department?.description ?? null;
    const dept = ensureDepartment(departmentId, departmentName, departmentDesc);

    const teamId = position.team?.id ?? "other-team";
    const teamName = position.team?.name ?? "Other";
    const teamDesc = position.team?.description ?? null;
    if (!dept.teams.has(teamId)) {
      dept.teams.set(teamId, { id: teamId, name: teamName, description: teamDesc, positions: [] });
    }
    const team = dept.teams.get(teamId)!;
    team.positions.push(position);
  });

  const departments = Array.from(departmentMap.values());

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Staff directory</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Synced from IVAO. Departments, teams, positions, and assignments are read-only.
        </p>
      </header>

      <StaffIvaoSync action={syncStaffFromIvao} />

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Access overrides</p>
            <p className="text-xs text-[color:var(--text-muted)]">
              Update a user role or permissions by VID. Permissions are ignored for ADMIN.
            </p>
          </div>
          <Link href={`/${locale}/admin/users`} className="text-xs text-[color:var(--primary)] hover:underline">
            Open users page
          </Link>
        </div>
        <form
          action={async (formData) => {
            "use server";
            await updateUserAccessByVid(formData, locale);
          }}
          className="space-y-3"
        >
          <div className="grid gap-2 md:grid-cols-3">
            <input
              name="vid"
              placeholder="VID (e.g. 123456)"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <select
              name="role"
              defaultValue="USER"
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="USER">USER</option>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
              <input type="checkbox" name="keepPermissions" defaultChecked />
              Keep existing permissions
            </label>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {STAFF_PERMISSIONS.map((perm) => (
              <label
                key={perm}
                className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-xs"
              >
                <input type="checkbox" name="permissions" value={perm} />
                <span className="text-[color:var(--text-primary)]">{perm}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Save access
            </Button>
          </div>
        </form>
      </Card>

      {!syncResult.success ? (
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{syncResult.error ?? "IVAO sync failed."}</p>
          {syncResult.errorDetail ? (
            <p className="mt-2 text-xs text-[color:var(--text-muted)]">
              {syncResult.errorDetail}
            </p>
          ) : null}
        </Card>
      ) : null}

      {departments.length === 0 ? (
        <Card className="p-4">
          <p className="text-sm text-[color:var(--text-muted)]">No staff data available.</p>
        </Card>
      ) : (
        departments.map((department) => (
          <Card key={department.id} className="space-y-4 p-4">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{department.name}</p>
              {department.description ? (
                <p className="text-xs text-[color:var(--text-muted)]">{department.description}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              {Array.from(department.teams.values()).map((team) => (
                <div key={team.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[color:var(--text-primary)]">{team.name}</p>
                      {team.description ? (
                        <p className="text-[11px] text-[color:var(--text-muted)]">{team.description}</p>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-[color:var(--text-muted)]">{team.positions.length} roles</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {team.positions.map((position) => (
                      <div
                        key={position.id}
                        className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{position.name}</p>
                            {position.description ? (
                              <p className="text-xs text-[color:var(--text-muted)]">{position.description}</p>
                            ) : null}
                          </div>
                          <span className="text-xs text-[color:var(--text-muted)]">{position.assignments.length}</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {position.assignments.map((assignment) => {
                            const displayName = assignment.user?.name ?? `VID ${assignment.userVid}`;
                            const photoUrl = assignment.user?.staffPhotoUrl ?? assignment.user?.avatarUrl ?? null;
                            return (
                              <div key={assignment.id} className="flex items-center gap-2 rounded-lg bg-[color:var(--surface)] p-2">
                                {photoUrl ? (
                                  <img src={photoUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-3)] text-[11px] font-semibold text-[color:var(--text-primary)]">
                                    {getInitials(displayName)}
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-[color:var(--text-primary)]">{displayName}</p>
                                  <p className="text-[11px] text-[color:var(--text-muted)]">VID {assignment.user?.vid ?? assignment.userVid}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </main>
  );
}
