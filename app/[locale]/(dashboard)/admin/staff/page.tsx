import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { STAFF_PERMISSIONS, requireStaffPermission } from "@/lib/staff";
import {
  assignStaff,
  seedDepartments,
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  removeAssignment,
  updateUserExtraPermissions,
  updateAssignment,
  updateDepartment,
  updatePosition,
} from "./actions";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const formatPermissions = (value: string | null) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string") as string[];
  } catch {
    // fall through
  }
  return [];
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

  const [departments, positions, assignments, users] = await Promise.all([
    prisma.staffDepartment.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] }),
    prisma.staffPosition.findMany({ orderBy: { name: "asc" }, include: { department: true } }),
    prisma.staffAssignment.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, vid: true, avatarUrl: true } }, position: { include: { department: true } } },
    }),
    prisma.user.findMany({ select: { id: true, name: true, vid: true, role: true, extraPermissions: true }, orderBy: { name: "asc" } }),
  ]);

  const userOptions = users.map((user) => ({
    id: user.id,
    vid: user.vid,
    name: user.name ?? user.vid,
    role: user.role ?? "USER",
    extras: formatPermissions(user.extraPermissions ?? null),
  }));

  return (
    <main className="space-y-4">
      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Departments</p>
          <form action={seedDepartments}>
            <Button size="sm" variant="secondary" type="submit">
              Seed typical departments
            </Button>
          </form>
        </div>
        <form action={createDepartment} className="grid gap-2 md:grid-cols-[1fr_1fr_2fr_120px]">
          <input
            name="name"
            placeholder="Department name"
            required
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="slug"
            placeholder="slug (e.g. training)"
            required
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="description"
            placeholder="Short description"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="order"
            type="number"
            defaultValue={0}
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <div className="md:col-span-4 flex flex-wrap gap-2 text-xs">
            {STAFF_PERMISSIONS.map((perm) => (
              <label key={perm} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-[color:var(--text-muted)]">
                <input type="checkbox" name="permissions" value={perm} className="h-3 w-3" />
                <span>{perm}</span>
              </label>
            ))}
          </div>
          <div className="md:col-span-4 flex justify-end">
            <Button size="sm" type="submit">
              Add department
            </Button>
          </div>
        </form>

        {departments.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No departments yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {departments.map((dept) => (
              <div
                key={dept.id}
                className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
              >
                <form action={updateDepartment} className="grid gap-2 md:grid-cols-[1fr_1fr_2fr_120px]">
                  <input type="hidden" name="id" value={dept.id} />
                  <input
                    name="name"
                    defaultValue={dept.name}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <input
                    name="description"
                    defaultValue={dept.description ?? ""}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <input
                    name="order"
                    type="number"
                    defaultValue={dept.order}
                    className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                  <div className="md:col-span-4 flex flex-wrap gap-2 text-[11px] text-[color:var(--text-muted)]">
                    {STAFF_PERMISSIONS.map((perm) => (
                      <label key={perm} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-2 py-1">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={perm}
                          defaultChecked={formatPermissions(dept.permissions).includes(perm)}
                          className="h-3 w-3"
                        />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" type="submit">
                      Save
                    </Button>
                  </div>
                </form>
                <form action={deleteDepartment} className="mt-2 flex justify-end">
                  <input type="hidden" name="id" value={dept.id} />
                  <Button size="sm" variant="ghost" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Staff positions</p>
        <form action={createPosition} className="grid gap-2 md:grid-cols-[1fr_1fr_2fr]">
          <input
            name="name"
            placeholder="Position name"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="slug"
            placeholder="slug (e.g. events-lead)"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="description"
            placeholder="Short description"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <select
            name="departmentId"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <input
            name="allowances"
            placeholder="Allowances (comma separated)"
            className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <div className="md:col-span-3 flex justify-end">
            <Button size="sm" type="submit">
              Add position
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Assign staff</p>
          <form action={assignStaff} className="grid gap-2 md:grid-cols-[1fr_1fr]">
            <input
              name="vid"
              placeholder="Member VID"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <select
              name="positionId"
              className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              <option value="">Select position</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}{pos.department ? ` (${pos.department.name})` : ""}
                </option>
              ))}
            </select>
            <div className="md:col-span-2 flex justify-end">
              <Button size="sm" type="submit">
                Assign
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Assignments</p>
            {assignments.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No staff assignments yet.</p>
            ) : (
              assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-[color:var(--text-primary)]">
                      {assignment.user?.name ?? assignment.userVid} - {assignment.position.name}
                    </p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      VID {assignment.userVid} - {assignment.position.department?.name ?? "No department"} - {assignment.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={updateAssignment}>
                      <input type="hidden" name="id" value={assignment.id} />
                      <label className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
                        <input type="checkbox" name="active" defaultChecked={assignment.active} />
                        <span>Active</span>
                      </label>
                      <Button size="sm" variant="secondary" type="submit">
                        Update
                      </Button>
                    </form>
                    <form action={removeAssignment}>
                      <input type="hidden" name="id" value={assignment.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">User extra access</p>
          {users.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No users available yet.</p>
          ) : (
            <form action={updateUserExtraPermissions} className="space-y-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
              <label className="text-xs text-[color:var(--text-muted)]">
                Search user
                <input
                  name="vid"
                  list="staff-user-options"
                  placeholder="Type name or VID"
                  className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  required
                />
              </label>
              <datalist id="staff-user-options">
                {userOptions.map((user) => (
                  <option key={user.id} value={user.vid}>
                    {user.name} ({user.vid})
                  </option>
                ))}
              </datalist>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-xs text-[color:var(--text-muted)]">
                  Name
                  <input
                    name="name"
                    placeholder="Optional new name"
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  />
                </label>
                <label className="text-xs text-[color:var(--text-muted)]">
                  Role
                  <select
                    name="role"
                    defaultValue="USER"
                    className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-xs text-[color:var(--text-primary)]"
                  >
                    <option value="USER">USER</option>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {STAFF_PERMISSIONS.map((perm) => (
                  <label key={`extra-${perm}`} className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-[color:var(--text-muted)]">
                    <input
                      type="checkbox"
                      name="userPermissions"
                      value={perm}
                      className="h-3 w-3"
                    />
                    <span>{perm}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="secondary" type="submit" name="accessMode" value="all">
                  Grant all
                </Button>
                <Button size="sm" variant="ghost" type="submit" name="accessMode" value="clear">
                  Clear
                </Button>
                <Button size="sm" type="submit">
                  Save
                </Button>
              </div>
              <p className="text-xs text-[color:var(--text-muted)]">
                Tip: choose a VID from the list to ensure changes apply to the right user.
              </p>
            </form>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Existing positions</p>
          {positions.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No positions created yet.</p>
          ) : (
            <div className="space-y-3">
              {positions.map((pos) => {
                const allowances = formatPermissions(pos.allowances);
                return (
                  <div key={pos.id} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                    <form action={updatePosition} className="space-y-2">
                      <input type="hidden" name="id" value={pos.id} />
                      <input
                        name="name"
                        defaultValue={pos.name}
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      />
                      <input
                        name="description"
                        defaultValue={pos.description ?? ""}
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      />
                      <select
                        name="departmentId"
                        defaultValue={pos.departmentId ?? ""}
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      >
                        <option value="">Select department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                      <input
                        name="allowances"
                        defaultValue={allowances.join(", ")}
                        placeholder="Allowances (comma separated)"
                        className="w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                      />
                      {pos.department?.permissions ? (
                        <p className="text-xs text-[color:var(--text-muted)]">
                          Department access: {formatPermissions(pos.department.permissions).join(", ") || "None"}
                        </p>
                      ) : null}
                      {allowances.length ? (
                        <p className="text-xs text-[color:var(--text-muted)]">
                          Allowances: {allowances.join(", ")}
                        </p>
                      ) : null}
                      <div className="flex justify-between gap-2">
                        <Button size="sm" variant="secondary" type="submit">
                          Save
                        </Button>
                      </div>
                    </form>
                    <form action={deletePosition} className="mt-2 flex justify-end">
                      <input type="hidden" name="id" value={pos.id} />
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
