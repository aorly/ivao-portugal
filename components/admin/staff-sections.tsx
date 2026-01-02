"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepartmentManager } from "@/components/admin/department-manager";
import { PositionCreateModal } from "@/components/admin/position-create-modal";

type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  permissions: string | null;
};

type Position = {
  id: string;
  name: string;
  description: string | null;
  allowances: string | null;
  departmentId: string | null;
  department?: { name: string; permissions: string | null } | null;
};

type Assignment = {
  id: string;
  userVid: string;
  active: boolean;
  user: { name: string | null } | null;
  position: { name: string; department?: { name: string | null } | null };
};

type UserOption = {
  id: string;
  vid: string;
  name: string;
  role: string;
  extras: string[];
};

type Action = (formData: FormData) => void | Promise<void>;

type Props = {
  departments: Department[];
  positions: Position[];
  assignments: Assignment[];
  userOptions: UserOption[];
  permissions: string[];
  createDepartment: Action;
  updateDepartment: Action;
  deleteDepartment: Action;
  seedDepartments: Action;
  reorderDepartments: Action;
  createPosition: Action;
  updatePosition: Action;
  deletePosition: Action;
  assignStaff: Action;
  updateAssignment: Action;
  removeAssignment: Action;
  updateUserExtraPermissions: Action;
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

type TabKey = "staff" | "departments" | "positions";

export function StaffSections({
  departments,
  positions,
  assignments,
  userOptions,
  permissions,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  seedDepartments,
  reorderDepartments,
  createPosition,
  updatePosition,
  deletePosition,
  assignStaff,
  updateAssignment,
  removeAssignment,
  updateUserExtraPermissions,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("staff");
  const tabs = useMemo(
    () => [
      { key: "staff" as const, label: "Staff", count: assignments.length },
      { key: "departments" as const, label: "Departments", count: departments.length },
      { key: "positions" as const, label: "Positions", count: positions.length },
    ],
    [assignments.length, departments.length, positions.length],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "secondary" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      {activeTab === "staff" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Assign staff</p>
              <p className="text-xs text-[color:var(--text-muted)]">Connect members to positions.</p>
            </div>
            <form action={assignStaff} className="grid gap-3 md:grid-cols-2">
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

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Assignments</p>
              {assignments.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No staff assignments yet.</p>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                          {assignment.user?.name ?? assignment.userVid} - {assignment.position.name}
                        </p>
                        <p className="text-xs text-[color:var(--text-muted)]">
                          VID {assignment.userVid} - {assignment.position.department?.name ?? "No department"} -{" "}
                          {assignment.active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateAssignment} className="flex items-center gap-2">
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
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">User access overrides</p>
              <p className="text-xs text-[color:var(--text-muted)]">Grant extra permissions or update roles.</p>
            </div>
            {userOptions.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No users available yet.</p>
            ) : (
              <form action={updateUserExtraPermissions} className="space-y-4">
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
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-[color:var(--text-muted)]">
                    Name
                    <input
                      name="name"
                      placeholder="Optional new name"
                      className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </label>
                  <label className="text-xs text-[color:var(--text-muted)]">
                    Role
                    <select
                      name="role"
                      defaultValue="USER"
                      className="mt-1 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    >
                      <option value="USER">USER</option>
                      <option value="STAFF">STAFF</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                </div>
                <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Extra permissions</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs text-[color:var(--text-muted)]">
                    {permissions.map((perm) => (
                      <label
                        key={`extra-${perm}`}
                        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1"
                      >
                        <input type="checkbox" name="userPermissions" value={perm} className="h-3 w-3" />
                        <span>{perm}</span>
                      </label>
                    ))}
                  </div>
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
        </section>
      ) : null}

      {activeTab === "departments" ? (
        <DepartmentManager
          departments={departments}
          permissions={permissions}
          createAction={createDepartment}
          updateAction={updateDepartment}
          deleteAction={deleteDepartment}
          seedAction={seedDepartments}
          reorderAction={reorderDepartments}
        />
      ) : null}

      {activeTab === "positions" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <PositionCreateModal
            departments={departments.map((dept) => ({ id: dept.id, name: dept.name }))}
            createAction={createPosition}
          />
          <Card className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Positions</p>
              <p className="text-xs text-[color:var(--text-muted)]">Update position details and allowances.</p>
            </div>
            {positions.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">No positions created yet.</p>
            ) : (
              <div className="space-y-3">
                {positions.map((pos) => {
                  const allowances = formatPermissions(pos.allowances);
                  return (
                    <div key={pos.id} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                      <form action={updatePosition} className="space-y-3">
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
                          <p className="text-xs text-[color:var(--text-muted)]">Allowances: {allowances.join(", ")}</p>
                        ) : null}
                        <div className="flex items-center justify-between gap-2">
                          <Button size="sm" variant="secondary" type="submit">
                            Save changes
                          </Button>
                          <form action={deletePosition}>
                            <input type="hidden" name="id" value={pos.id} />
                            <Button size="sm" variant="ghost" type="submit">
                              Delete
                            </Button>
                          </form>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
