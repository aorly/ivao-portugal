import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const ADMIN_ROLE = "ADMIN";

export type StaffPermission =
  | "admin:events"
  | "admin:training"
  | "admin:exams"
  | "admin:airports"
  | "admin:firs"
  | "admin:airspace"
  | "admin:frequencies"
  | "admin:transition-levels"
  | "admin:airac"
  | "admin:significant-points"
  | "admin:pages"
  | "admin:analytics"
  | "admin:menus"
  | "admin:audit"
  | "admin:staff";

export const STAFF_PERMISSIONS: StaffPermission[] = [
  "admin:events",
  "admin:training",
  "admin:exams",
  "admin:airports",
  "admin:firs",
  "admin:airspace",
  "admin:frequencies",
  "admin:transition-levels",
  "admin:airac",
  "admin:significant-points",
  "admin:pages",
  "admin:analytics",
  "admin:menus",
  "admin:audit",
  "admin:staff",
];

const parsePermissions = (value: string | null | undefined): StaffPermission[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item) => typeof item === "string") as StaffPermission[];
  } catch {
    // fall through
  }
  return [];
};

export const getStaffPermissions = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, extraPermissions: true },
  });
  if (!user) return new Set<StaffPermission>();
  if (user.role === ADMIN_ROLE) return new Set<StaffPermission>(STAFF_PERMISSIONS);

  const assignments = await prisma.staffAssignment.findMany({
    where: { userId, active: true },
    include: {
      position: {
        select: {
          department: { select: { permissions: true } },
        },
      },
    },
  });
  const permissions = new Set<StaffPermission>();
  assignments.forEach((assignment) => {
    parsePermissions(assignment.position.department?.permissions).forEach((perm) => permissions.add(perm));
  });
  parsePermissions(user.extraPermissions).forEach((perm) => permissions.add(perm));
  return permissions;
};

export const hasStaffPermission = async (userId: string, permission: StaffPermission) => {
  const permissions = await getStaffPermissions(userId);
  return permissions.has(permission);
};

export const requireStaffPermission = async (permission: StaffPermission) => {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.role === ADMIN_ROLE) return true;
  return hasStaffPermission(session.user.id, permission);
};
