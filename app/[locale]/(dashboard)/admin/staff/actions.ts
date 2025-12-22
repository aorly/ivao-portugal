"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_PERMISSIONS, requireStaffPermission } from "@/lib/staff";

const ensureStaffAdmin = async () => {
  const ok = await requireStaffPermission("admin:staff");
  if (!ok) throw new Error("Unauthorized");
  return auth();
};

const parsePermissions = (formData: FormData, key = "permissions") => {
  const values = formData.getAll(key).map((item) => String(item));
  const allowed = new Set(STAFF_PERMISSIONS);
  return values.filter((value) => allowed.has(value as any));
};

const parseAllowances = (formData: FormData) => {
  const raw = String(formData.get("allowances") ?? "");
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const logAudit = async (actorId: string | null, action: string, entityType: string, entityId: string | null, before?: unknown, after?: unknown) => {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null,
    },
  });
};

const DEFAULT_DEPARTMENTS = [
  { name: "Operational Departments", slug: "operations", order: 0 },
  { name: "Training Department", slug: "training", order: 1 },
  { name: "Membership Department", slug: "membership", order: 2 },
  { name: "Events Department", slug: "events", order: 3 },
  { name: "Public Relations Department", slug: "public-relations", order: 4 },
  { name: "Web Development Department", slug: "web", order: 5 },
  { name: "FIR Chiefs and Service Teams", slug: "fir-chiefs", order: 6 },
];

export async function seedDepartments() {
  const session = await ensureStaffAdmin();
  const existing = await prisma.staffDepartment.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((dept) => dept.slug));
  const toCreate = DEFAULT_DEPARTMENTS.filter((dept) => !existingSlugs.has(dept.slug));
  if (toCreate.length === 0) return;

  const created = await prisma.$transaction(
    toCreate.map((dept) =>
      prisma.staffDepartment.create({
        data: {
          name: dept.name,
          slug: dept.slug,
          order: dept.order,
        },
      }),
    ),
  );
  await logAudit(session?.user?.id ?? null, "seed", "staffDepartment", null, null, created);
}

export async function createDepartment(formData: FormData) {
  const session = await ensureStaffAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const permissions = parsePermissions(formData);
  if (!name || !slug) {
    return { error: "Missing name or slug" };
  }

  const created = await prisma.staffDepartment.create({
    data: {
      name,
      slug,
      description: description || null,
      order: Number.isFinite(order) ? order : 0,
      permissions: JSON.stringify(permissions),
    },
  });
  await logAudit(session?.user?.id ?? null, "create", "staffDepartment", created.id, null, created);
  return { success: true };
}

export async function updateDepartment(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const permissions = parsePermissions(formData);
  if (!id || !name) throw new Error("Missing department");

  const before = await prisma.staffDepartment.findUnique({ where: { id } });
  const updated = await prisma.staffDepartment.update({
    where: { id },
    data: {
      name,
      description: description || null,
      order: Number.isFinite(order) ? order : 0,
      permissions: JSON.stringify(permissions),
    },
  });
  await logAudit(session?.user?.id ?? null, "update", "staffDepartment", id, before, updated);
}

export async function deleteDepartment(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing department");
  const before = await prisma.staffDepartment.findUnique({ where: { id } });
  await prisma.staffDepartment.delete({ where: { id } });
  await logAudit(session?.user?.id ?? null, "delete", "staffDepartment", id, before, null);
}

export async function createPosition(formData: FormData) {
  const session = await ensureStaffAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim() || null;
  const allowances = parseAllowances(formData);
  if (!name || !slug) throw new Error("Missing name or slug");

  const created = await prisma.staffPosition.create({
    data: {
      name,
      slug,
      description: description || null,
      departmentId,
      allowances: JSON.stringify(allowances),
    },
  });
  await logAudit(session?.user?.id ?? null, "create", "staffPosition", created.id, null, created);
}

export async function updatePosition(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const departmentId = String(formData.get("departmentId") ?? "").trim() || null;
  const allowances = parseAllowances(formData);
  if (!id || !name) throw new Error("Missing position");

  const before = await prisma.staffPosition.findUnique({ where: { id } });
  const updated = await prisma.staffPosition.update({
    where: { id },
    data: {
      name,
      description: description || null,
      departmentId,
      allowances: JSON.stringify(allowances),
    },
  });
  await logAudit(session?.user?.id ?? null, "update", "staffPosition", id, before, updated);
}

export async function deletePosition(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing position");
  const before = await prisma.staffPosition.findUnique({ where: { id } });
  await prisma.staffPosition.delete({ where: { id } });
  await logAudit(session?.user?.id ?? null, "delete", "staffPosition", id, before, null);
}

export async function assignStaff(formData: FormData) {
  const session = await ensureStaffAdmin();
  const vid = String(formData.get("vid") ?? "").trim();
  const positionId = String(formData.get("positionId") ?? "").trim();
  if (!vid || !positionId) throw new Error("Missing VID or position");

  const user = await prisma.user.findUnique({ where: { vid }, select: { id: true, role: true } });

  const assignment = await prisma.staffAssignment.upsert({
    where: { userVid_positionId: { userVid: vid, positionId } },
    create: {
      userVid: vid,
      userId: user?.id ?? null,
      positionId,
      active: true,
    },
    update: {
      userId: user?.id ?? null,
      active: true,
    },
  });

  if (user?.id && user.role === "USER") {
    await prisma.user.update({ where: { id: user.id }, data: { role: "STAFF" } });
  }
  await logAudit(session?.user?.id ?? null, "assign", "staffAssignment", assignment.id, null, assignment);
}

export async function updateAssignment(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!id) throw new Error("Missing assignment");

  const before = await prisma.staffAssignment.findUnique({ where: { id } });
  const updated = await prisma.staffAssignment.update({
    where: { id },
    data: { active },
  });
  await logAudit(session?.user?.id ?? null, "update", "staffAssignment", id, before, updated);
}

export async function removeAssignment(formData: FormData) {
  const session = await ensureStaffAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing assignment");
  const before = await prisma.staffAssignment.findUnique({ where: { id } });
  await prisma.staffAssignment.delete({ where: { id } });
  await logAudit(session?.user?.id ?? null, "remove", "staffAssignment", id, before, null);
}

export async function updateUserExtraPermissions(formData: FormData) {
  const session = await ensureStaffAdmin();
  const vid = String(formData.get("vid") ?? "").trim();
  const accessMode = String(formData.get("accessMode") ?? "").trim();
  const permissions =
    accessMode === "all"
      ? STAFF_PERMISSIONS
      : accessMode === "clear"
        ? []
        : parsePermissions(formData, "userPermissions");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim().toUpperCase();
  const allowedRoles = new Set(["USER", "STAFF", "ADMIN"]);
  if (!vid) throw new Error("Missing VID");
  const user = await prisma.user.findUnique({ where: { vid } });
  if (!user) throw new Error("User not found");

  const before = await prisma.user.findUnique({ where: { id: user.id }, select: { extraPermissions: true } });
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      extraPermissions: JSON.stringify(permissions),
      name: name || user.name,
      role: allowedRoles.has(role) ? role : user.role,
    },
    select: { id: true, extraPermissions: true, name: true, role: true },
  });
  await logAudit(session?.user?.id ?? null, "update", "user", user.id, before, updated);
}
