"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";
import { DEFAULT_MENUS, type MenuKey, type MenuItemNode } from "@/lib/menu";

const ensureMenusAdmin = async () => {
  const allowed = await requireStaffPermission("admin:menus");
  if (!allowed) throw new Error("Unauthorized");
};

const logAudit = async (
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: unknown,
  after?: unknown,
) => {
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

const getMenuKey = (formData: FormData): MenuKey => {
  const key = String(formData.get("menuKey") ?? "").trim();
  if (key !== "public" && key !== "admin" && key !== "footer") {
    throw new Error("Invalid menu key");
  }
  return key;
};

const revalidateMenus = (locale: string) => {
  revalidatePath(`/${locale}/admin/menus`);
  revalidatePath(`/${locale}/admin`);
  revalidatePath(`/${locale}/home`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/airports`);
  revalidatePath(`/${locale}/airspace`);
  revalidatePath(`/${locale}/staff`);
  revalidatePath(`/${locale}/documentation`);
  revalidateTag("menu");
};

const collectDefaults = (items: MenuItemNode[], menuId: string, parentId: string | null) => {
  const records: Array<{
    menuId: string;
    parentId: string | null;
    label: string;
    labelPt: string | null;
    description: string | null;
    descriptionPt: string | null;
    href: string | null;
    icon: string | null;
    layout: string | null;
    order: number;
    enabled: boolean;
    permission: string | null;
    tempId: string;
  }> = [];

  items.forEach((item, index) => {
    const tempId = `${parentId ?? "root"}-${item.label}-${index}`.replace(/\s+/g, "-").toLowerCase();
    records.push({
      menuId,
      parentId,
      label: item.label,
      labelPt: item.labelPt ?? null,
      description: item.description ?? null,
      descriptionPt: item.descriptionPt ?? null,
      href: item.href ?? null,
      icon: item.icon ?? null,
      layout: item.layout ?? null,
      order: typeof item.order === "number" ? item.order : index,
      enabled: item.enabled ?? true,
      permission: item.permission ?? null,
      tempId,
    });
    if (item.children?.length) {
      records.push(...collectDefaults(item.children, menuId, tempId));
    }
  });

  return records;
};

export async function initializeMenu(formData: FormData) {
  await ensureMenusAdmin();
  const session = await auth();
  const menuKey = getMenuKey(formData);
  const locale = String(formData.get("locale") ?? "en");

  const existing = await prisma.menu.findUnique({ where: { key: menuKey } });
  if (existing) return;

  const menu = await prisma.menu.create({
    data: {
      key: menuKey,
      title: menuKey === "public" ? "Public menu" : menuKey === "admin" ? "Admin menu" : "Footer menu",
    },
  });

  const defaults = collectDefaults(DEFAULT_MENUS[menuKey], menu.id, null);
  const idMap = new Map<string, string>();

  for (const item of defaults) {
    const created = await prisma.menuItem.create({
      data: {
        menuId: menu.id,
        parentId: item.parentId ? idMap.get(item.parentId) ?? null : null,
        label: item.label,
        labelPt: item.labelPt,
        description: item.description,
        descriptionPt: item.descriptionPt,
        href: item.href,
        icon: item.icon,
        layout: item.layout,
        order: item.order,
        enabled: item.enabled,
        permission: item.permission,
      },
    });
    idMap.set(item.tempId, created.id);
  }

  await logAudit(session?.user?.id ?? null, "initialize", "menu", menu.id, null, { key: menuKey });
  revalidateMenus(locale);
}

export async function createMenuItem(formData: FormData) {
  await ensureMenusAdmin();
  const session = await auth();
  const menuKey = getMenuKey(formData);
  const locale = String(formData.get("locale") ?? "en");
  const label = String(formData.get("label") ?? "").trim();
  const labelPt = String(formData.get("labelPt") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const descriptionPt = String(formData.get("descriptionPt") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const layout = String(formData.get("layout") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const permission = String(formData.get("permission") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!label) throw new Error("Missing label");

  const menu =
    (await prisma.menu.findUnique({ where: { key: menuKey } })) ??
    (await prisma.menu.create({
      data: {
        key: menuKey,
        title: menuKey === "public" ? "Public menu" : menuKey === "admin" ? "Admin menu" : "Footer menu",
      },
    }));

  const created = await prisma.menuItem.create({
    data: {
      menuId: menu.id,
      parentId: parentIdRaw || null,
      label,
      labelPt: labelPt || null,
      description: description || null,
      descriptionPt: descriptionPt || null,
      href: href || null,
      icon: icon || null,
      layout: layout || null,
      order: Number.isFinite(order) ? order : 0,
      enabled,
      permission: permission || null,
    },
  });

  await logAudit(session?.user?.id ?? null, "create", "menuItem", created.id, null, created);
  revalidateMenus(locale);
}

export async function updateMenuItem(formData: FormData) {
  await ensureMenusAdmin();
  const session = await auth();
  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  const label = String(formData.get("label") ?? "").trim();
  const labelPt = String(formData.get("labelPt") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const descriptionPt = String(formData.get("descriptionPt") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim();
  const layout = String(formData.get("layout") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const parentIdRaw = String(formData.get("parentId") ?? "").trim();
  const permission = String(formData.get("permission") ?? "").trim();
  const enabled = formData.get("enabled") === "on";

  if (!id || !label) throw new Error("Missing item");

  const before = await prisma.menuItem.findUnique({ where: { id } });
  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      label,
      labelPt: labelPt || null,
      description: description || null,
      descriptionPt: descriptionPt || null,
      href: href || null,
      icon: icon || null,
      layout: layout || null,
      order: Number.isFinite(order) ? order : 0,
      parentId: parentIdRaw || null,
      enabled,
      permission: permission || null,
    },
  });

  await logAudit(session?.user?.id ?? null, "update", "menuItem", id, before, updated);
  revalidateMenus(locale);
}

export async function deleteMenuItem(formData: FormData) {
  await ensureMenusAdmin();
  const session = await auth();
  const id = String(formData.get("id") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en");
  if (!id) throw new Error("Missing item");

  const before = await prisma.menuItem.findUnique({ where: { id } });
  await prisma.menuItem.delete({ where: { id } });
  await logAudit(session?.user?.id ?? null, "delete", "menuItem", id, before, null);
  revalidateMenus(locale);
}

const normalizeTree = (value: unknown): MenuItemNode[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      const label = String(raw.label ?? "").trim();
      if (!label) return null;
      const labelPt = typeof raw.labelPt === "string" ? raw.labelPt.trim() : null;
      const description = typeof raw.description === "string" ? raw.description.trim() : null;
      const descriptionPt = typeof raw.descriptionPt === "string" ? raw.descriptionPt.trim() : null;
      const href = typeof raw.href === "string" ? raw.href.trim() : null;
      const icon = typeof raw.icon === "string" ? raw.icon.trim() : null;
      const layout = typeof raw.layout === "string" ? raw.layout.trim() : null;
      const permission = typeof raw.permission === "string" ? raw.permission.trim() : null;
      const enabled = raw.enabled === false ? false : true;
      const children = normalizeTree(raw.children);
      return {
        label,
        labelPt: labelPt || null,
        description: description || null,
        descriptionPt: descriptionPt || null,
        href: href || null,
        icon: icon || null,
        layout: layout || null,
        permission: permission || null,
        enabled,
        order: typeof raw.order === "number" ? raw.order : index,
        children,
      } as MenuItemNode;
    })
    .filter(Boolean) as MenuItemNode[];
};

const createTree = async (menuId: string, items: MenuItemNode[], parentId: string | null) => {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const created = await prisma.menuItem.create({
      data: {
        menuId,
        parentId,
        label: item.label,
        labelPt: item.labelPt ?? null,
        description: item.description ?? null,
        descriptionPt: item.descriptionPt ?? null,
        href: item.href ?? null,
        icon: item.icon ?? null,
        layout: item.layout ?? null,
        order: typeof item.order === "number" ? item.order : index,
        enabled: item.enabled !== false,
        permission: item.permission ?? null,
      },
    });
    if (item.children && item.children.length) {
      await createTree(menuId, item.children, created.id);
    }
  }
};

export async function saveMenuTree(formData: FormData) {
  await ensureMenusAdmin();
  const session = await auth();
  const menuKey = getMenuKey(formData);
  const locale = String(formData.get("locale") ?? "en");
  const raw = String(formData.get("payload") ?? "[]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid menu payload");
  }

  const tree = normalizeTree(parsed);
  const menu =
    (await prisma.menu.findUnique({ where: { key: menuKey } })) ??
    (await prisma.menu.create({
      data: {
        key: menuKey,
        title: menuKey === "public" ? "Public menu" : menuKey === "admin" ? "Admin menu" : "Footer menu",
      },
    }));

  const before = await prisma.menuItem.findMany({ where: { menuId: menu.id } });
  await prisma.menuItem.deleteMany({ where: { menuId: menu.id } });
  await createTree(menu.id, tree, null);
  await logAudit(session?.user?.id ?? null, "replace", "menu", menu.id, before, tree);
  revalidateMenus(locale);
}
