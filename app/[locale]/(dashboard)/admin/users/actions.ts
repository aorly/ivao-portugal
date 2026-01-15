"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { type Locale } from "@/i18n";
import { requireStaffPermission, STAFF_PERMISSIONS, type StaffPermission } from "@/lib/staff";

const ROLE_VALUES = ["USER", "STAFF", "ADMIN"] as const;
type UserRole = (typeof ROLE_VALUES)[number];

const parseRole = (value: FormDataEntryValue | null) => {
  const raw = String(value ?? "").toUpperCase().trim();
  return ROLE_VALUES.includes(raw as UserRole) ? (raw as UserRole) : "USER";
};

const parsePermissions = (formData: FormData) => {
  const selected = formData.getAll("permissions").map((value) => String(value));
  return selected.filter((perm): perm is StaffPermission => STAFF_PERMISSIONS.includes(perm as StaffPermission));
};

const ensureAccess = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:staff");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

const updateUserAccessInternal = async (userId: string, formData: FormData, locale: Locale) => {
  const session = await ensureAccess();
  const role = parseRole(formData.get("role"));
  const keepPermissions = formData.get("keepPermissions") === "on";
  const permissions = parsePermissions(formData);

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, extraPermissions: true, id: true, vid: true, name: true },
  });
  if (!before) throw new Error("User not found");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      ...(keepPermissions ? {} : { extraPermissions: JSON.stringify(permissions) }),
    },
    select: { role: true, extraPermissions: true, id: true, vid: true, name: true },
  });

  await logAudit({
    actorId: session.user.id,
    action: "update-access",
    entityType: "user",
    entityId: userId,
    before,
    after: updated,
  });

  revalidatePath(`/${locale}/admin/users`);
  revalidatePath(`/${locale}/admin/staff`);
};

export async function updateUserAccess(formData: FormData, locale: Locale) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Missing user id");
  await updateUserAccessInternal(userId, formData, locale);
}

export async function updateUserAccessByVid(formData: FormData, locale: Locale) {
  const vid = String(formData.get("vid") ?? "").trim();
  if (!vid) throw new Error("Missing VID");
  const user = await prisma.user.findUnique({ where: { vid }, select: { id: true } });
  if (!user) throw new Error("User not found");
  await updateUserAccessInternal(user.id, formData, locale);
}
