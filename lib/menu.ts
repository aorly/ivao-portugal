import { prisma } from "@/lib/prisma";

export type MenuKey = "public" | "admin";

export type MenuItemNode = {
  id?: string;
  label: string;
  labelPt?: string | null;
  description?: string | null;
  descriptionPt?: string | null;
  href?: string | null;
  icon?: string | null;
  layout?: string | null;
  order?: number;
  enabled?: boolean;
  permission?: string | null;
  children?: MenuItemNode[];
};

const DEFAULT_PUBLIC_MENU: MenuItemNode[] = [
  { label: "Home", labelPt: "Inicio", href: "/home", order: 0, icon: "home", description: "Latest division highlights." },
  { label: "Events", labelPt: "Eventos", href: "/events", order: 1, icon: "calendar", description: "Upcoming community events." },
  {
    label: "Airports",
    labelPt: "Aeroportos",
    order: 2,
    children: [
      {
        label: "Airports",
        labelPt: "Aeroportos",
        href: "/airports",
        order: 0,
        icon: "map",
        description: "Browse airports and layouts.",
      },
      {
        label: "Timetable",
        labelPt: "Horarios",
        href: "/airports/timetable",
        order: 1,
        icon: "clock",
        description: "Scheduled activity windows.",
      },
    ],
  },
  { label: "Airspace", labelPt: "Espaco aereo", href: "/airspace", order: 3, icon: "globe", description: "FIRs and coverage." },
  { label: "Training", labelPt: "Treino", href: "/training", order: 4, icon: "training", description: "Courses and exams." },
  { label: "Staff", labelPt: "Staff", href: "/staff", order: 5, icon: "users", description: "Meet the team." },
  { label: "Pages", labelPt: "Paginas", href: "/pages", order: 6, icon: "file", description: "Guides and documents." },
  {
    label: "Admin",
    labelPt: "Admin",
    href: "/admin",
    order: 7,
    permission: "staff-only",
    icon: "shield",
    description: "Staff-only tools.",
  },
];

const DEFAULT_ADMIN_MENU: MenuItemNode[] = [
  {
    label: "Overview",
    order: 0,
    children: [{ label: "Overview", href: "/admin", order: 0 }],
  },
  {
    label: "Operations",
    order: 1,
    children: [
      { label: "Events", href: "/admin/events", order: 0, permission: "admin:events", icon: "calendar" },
      { label: "Training", href: "/admin/training", order: 1, permission: "admin:training", icon: "training" },
      { label: "Exams", href: "/admin/exams", order: 2, permission: "admin:exams", icon: "certificate" },
    ],
  },
  {
    label: "Content",
    order: 2,
    children: [
      { label: "Pages", href: "/admin/pages", order: 0, permission: "admin:pages", icon: "file" },
      { label: "Menus", href: "/admin/menus", order: 1, permission: "admin:menus", icon: "menu" },
      { label: "Staff", href: "/admin/staff", order: 2, permission: "admin:staff", icon: "users" },
    ],
  },
  {
    label: "Infrastructure",
    order: 3,
    children: [
      { label: "Airports", href: "/admin/airports", order: 0, permission: "admin:airports", icon: "map" },
      { label: "Create airport", href: "/admin/airports/new", order: 1, permission: "admin:airports", icon: "plus" },
      { label: "FIRs", href: "/admin/firs", order: 2, permission: "admin:firs", icon: "globe" },
      { label: "Frequencies", href: "/admin/frequencies", order: 3, permission: "admin:frequencies", icon: "radio" },
      { label: "Airspace", href: "/admin/airspace", order: 4, permission: "admin:airspace", icon: "layers" },
      {
        label: "Transition levels",
        href: "/admin/transition-levels",
        order: 5,
        permission: "admin:transition-levels",
        icon: "levels",
      },
      { label: "AIRAC data", href: "/admin/airac", order: 6, permission: "admin:airac", icon: "database" },
      {
        label: "Significant points",
        href: "/admin/significant-points",
        order: 7,
        permission: "admin:significant-points",
        icon: "map-pin",
      },
    ],
  },
  {
    label: "Insights",
    order: 4,
    children: [
      { label: "Analytics", href: "/admin/analytics", order: 0, permission: "admin:analytics", icon: "chart" },
      { label: "Analytics settings", href: "/admin/analytics/settings", order: 1, permission: "admin:analytics", icon: "settings" },
      { label: "Audit logs", href: "/admin/audit-logs", order: 2, permission: "admin:audit", icon: "shield" },
    ],
  },
];

export const DEFAULT_MENUS: Record<MenuKey, MenuItemNode[]> = {
  public: DEFAULT_PUBLIC_MENU,
  admin: DEFAULT_ADMIN_MENU,
};

type MenuItemRecord = {
  id: string;
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
};

const buildTree = (items: MenuItemRecord[]): MenuItemNode[] => {
  const byParent = new Map<string | null, MenuItemRecord[]>();
  items.forEach((item) => {
    const key = item.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(item);
    byParent.set(key, list);
  });

  const buildLevel = (parentId: string | null): MenuItemNode[] => {
    const level = (byParent.get(parentId) ?? []).sort((a, b) => a.order - b.order);
    return level.map((item) => ({
      id: item.id,
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
      children: buildLevel(item.id),
    }));
  };

  return buildLevel(null);
};

export const getMenu = async (menuKey: MenuKey): Promise<MenuItemNode[]> => {
  const menu = await prisma.menu.findUnique({
    where: { key: menuKey },
    include: { items: { orderBy: { order: "asc" } } },
  });

  if (!menu) {
    return DEFAULT_MENUS[menuKey];
  }

  return buildTree(menu.items);
};

export const getMenuAdminData = async (menuKey: MenuKey) => {
  const menu = await prisma.menu.findUnique({
    where: { key: menuKey },
    include: { items: { orderBy: { order: "asc" } } },
  });
  return menu;
};
