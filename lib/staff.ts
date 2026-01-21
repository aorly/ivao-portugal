import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { cache } from "react";
import { ivaoClient } from "@/lib/ivaoClient";
import { getSiteConfig } from "@/lib/site-config";

export const ADMIN_ROLE = "ADMIN";

export type StaffPermission =
  | "admin:events"
  | "admin:airports"
  | "admin:airlines"
  | "admin:firs"
  | "admin:airspace"
  | "admin:frequencies"
  | "admin:transition-levels"
  | "admin:airac"
  | "admin:significant-points"
  | "admin:pages"
  | "admin:analytics"
  | "admin:feedback"
  | "admin:menus"
  | "admin:settings"
  | "admin:audit"
  | "admin:staff";

export const STAFF_PERMISSIONS: StaffPermission[] = [
  "admin:events",
  "admin:airports",
  "admin:airlines",
  "admin:firs",
  "admin:airspace",
  "admin:frequencies",
  "admin:transition-levels",
  "admin:airac",
  "admin:significant-points",
  "admin:pages",
  "admin:analytics",
  "admin:feedback",
  "admin:menus",
  "admin:settings",
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

const hasAnyStaffAssignment = cache(async (userId: string, userVid?: string | null) => {
  const assignment = await prisma.ivaoStaffAssignment.findFirst({
    where: {
      active: true,
      OR: [{ userId }, ...(userVid ? [{ userVid }] : [])],
    },
    select: { id: true },
  });
  return Boolean(assignment);
});

const isIvaoStaffMember = cache(async (userVid: string | null | undefined) => {
  if (!userVid) return false;
  const config = await getSiteConfig();
  const divisionId = config.divisionId?.toUpperCase() ?? "PT";
  const payload = await ivaoClient.getUserStaffPositions(divisionId, 1);
  if (!payload || typeof payload !== "object") return false;
  const itemsPayload =
    (payload as { items?: unknown }).items ??
    (payload as { data?: { items?: unknown } }).data?.items ??
    (payload as { result?: { items?: unknown } }).result?.items ??
    payload;
  const items = asArray(itemsPayload);
  return items.some((item) => String(item.userId ?? item.user_id ?? "") === userVid);
});

const getStaffPermissionsCached = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, extraPermissions: true },
  });
  if (!user) return new Set<StaffPermission>();
  if (user.role === ADMIN_ROLE) return new Set<StaffPermission>(STAFF_PERMISSIONS);
  const permissions = new Set<StaffPermission>();
  parsePermissions(user.extraPermissions).forEach((perm) => permissions.add(perm));
  return permissions;
});

export const getStaffPermissions = async (userId: string) => getStaffPermissionsCached(userId);

export const hasStaffPermission = async (userId: string, permission: StaffPermission) => {
  const permissions = await getStaffPermissions(userId);
  return permissions.has(permission);
};

export const requireStaffPermission = async (permission: StaffPermission) => {
  const session = await auth();
  if (!session?.user?.id) return false;
  if (session.user.role === ADMIN_ROLE) return true;
  if (permission === "admin:staff") {
    const hasAssignment = await hasAnyStaffAssignment(session.user.id, session.user.vid ?? null);
    if (hasAssignment) return true;
    const isIvaoStaff = await isIvaoStaffMember(session.user.vid ?? null);
    if (isIvaoStaff) return true;
  }
  return hasStaffPermission(session.user.id, permission);
};
