import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { STAFF_PERMISSIONS, requireStaffPermission } from "@/lib/staff";
import { StaffSections } from "@/components/admin/staff-sections";
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
  updateDepartmentOrder,
  updatePosition,
} from "./actions";
import { getTranslations } from "next-intl/server";
import { unstable_cache } from "next/cache";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const getStaffData = unstable_cache(
  async () => {
    const [departments, positions, assignments, users] = await Promise.all([
      prisma.staffDepartment.findMany({
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, description: true, order: true, permissions: true },
      }),
      prisma.staffPosition.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          allowances: true,
          departmentId: true,
          department: { select: { name: true, permissions: true } },
        },
      }),
      prisma.staffAssignment.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userVid: true,
          active: true,
          user: { select: { name: true } },
          position: { select: { name: true, department: { select: { name: true } } } },
        },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, vid: true, role: true, extraPermissions: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { departments, positions, assignments, users };
  },
  ["admin-staff-data"],
  { revalidate: 300, tags: ["staff-admin"] },
);

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

  const { departments, positions, assignments, users } = await getStaffData();

  const userOptions = users.map((user) => ({
    id: user.id,
    vid: user.vid,
    name: user.name ?? user.vid,
    role: user.role ?? "USER",
    extras: formatPermissions(user.extraPermissions ?? null),
  }));

  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Staff management</p>
        <p className="text-sm text-[color:var(--text-muted)]">
          Organize departments, roles, and access. Assign members to positions and manage extra permissions.
        </p>
      </header>

      <StaffSections
        departments={departments}
        positions={positions}
        assignments={assignments}
        userOptions={userOptions}
        permissions={STAFF_PERMISSIONS}
        createDepartment={createDepartment}
        updateDepartment={updateDepartment}
        deleteDepartment={deleteDepartment}
        seedDepartments={seedDepartments}
        reorderDepartments={updateDepartmentOrder}
        createPosition={createPosition}
        updatePosition={updatePosition}
        deletePosition={deletePosition}
        assignStaff={assignStaff}
        updateAssignment={updateAssignment}
        removeAssignment={removeAssignment}
        updateUserExtraPermissions={updateUserExtraPermissions}
      />
    </main>
  );
}
