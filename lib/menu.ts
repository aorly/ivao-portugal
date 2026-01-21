import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type MenuKey = "public" | "admin" | "footer";

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
  { label: "IVAO Events", labelPt: "Eventos IVAO", href: "/ivao-events", order: 2, icon: "calendar", description: "Official IVAO events." },
  {
    label: "Airports",
    labelPt: "Aeroportos",
    order: 3,
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
  { label: "Airlines", labelPt: "Companhias", href: "/airlines", order: 4, icon: "plane", description: "Local virtual airlines." },
  { label: "Staff", labelPt: "Staff", href: "/staff", order: 5, icon: "users", description: "Meet the team." },
  {
    label: "Documentation",
    labelPt: "Documentacao",
    href: "/documentation",
    order: 6,
    icon: "book",
    description: "Staff-maintained documentation.",
  },
  {
    label: "Admin",
    labelPt: "Admin",
    href: "/admin",
    order: 6,
    permission: "staff-only",
    icon: "shield",
    description: "Staff-only tools.",
  },
];

const DEFAULT_ADMIN_MENU: MenuItemNode[] = [
  {
    label: "Dashboard",
    order: 0,
    children: [{ label: "Overview", href: "/admin", order: 0, icon: "home" }],
  },
  {
    label: "Content",
    order: 1,
    children: [
      {
        label: "Pages",
        order: 0,
        icon: "file",
        children: [
          { label: "All pages", href: "/admin/pages", order: 0, permission: "admin:pages", icon: "file" },
          { label: "Create page", href: "/admin/pages/new", order: 1, permission: "admin:pages", icon: "plus" },
          {
            label: "Page categories",
            href: "/admin/page-categories",
            order: 2,
            permission: "admin:pages",
            icon: "file",
          },
        ],
      },
      {
        label: "Menus",
        order: 1,
        icon: "menu",
        children: [
          { label: "All menus", href: "/admin/menus", order: 0, permission: "admin:menus", icon: "menu" },
          { label: "Public menu", href: "/admin/menus/public", order: 1, permission: "admin:menus", icon: "menu" },
          { label: "Admin menu", href: "/admin/menus/admin", order: 2, permission: "admin:menus", icon: "menu" },
          { label: "Footer menu", href: "/admin/menus/footer", order: 3, permission: "admin:menus", icon: "menu" },
        ],
      },
      { label: "Staff", href: "/admin/staff", order: 2, permission: "admin:staff", icon: "users" },
      { label: "Users", href: "/admin/users", order: 3, permission: "admin:staff", icon: "users" },
    ],
  },
  {
    label: "Operations",
    order: 2,
    children: [
      { label: "Events", href: "/admin/events", order: 0, permission: "admin:events", icon: "calendar" },
      { label: "Calendar", href: "/admin/calendar", order: 1, permission: "admin:events", icon: "calendar" },
    ],
  },
  {
    label: "Infrastructure",
    order: 3,
    children: [
      {
        label: "Airports",
        order: 0,
        icon: "map",
        children: [
          { label: "All airports", href: "/admin/airports", order: 0, permission: "admin:airports", icon: "map" },
          {
            label: "Create airport",
            href: "/admin/airports/new",
            order: 1,
            permission: "admin:airports",
            icon: "plus",
          },
        ],
      },
      { label: "Airlines", href: "/admin/airlines", order: 2, permission: "admin:airlines", icon: "plane" },
      { label: "FIRs", href: "/admin/firs", order: 3, permission: "admin:firs", icon: "globe" },
      { label: "Frequencies", href: "/admin/frequencies", order: 4, permission: "admin:frequencies", icon: "radio" },
      { label: "Airspace", href: "/admin/airspace", order: 5, permission: "admin:airspace", icon: "layers" },
      {
        label: "Transition levels",
        href: "/admin/transition-levels",
        order: 6,
        permission: "admin:transition-levels",
        icon: "levels",
      },
      { label: "AIRAC data", href: "/admin/airac", order: 7, permission: "admin:airac", icon: "database" },
      {
        label: "Significant points",
        href: "/admin/significant-points",
        order: 8,
        permission: "admin:significant-points",
        icon: "map-pin",
      },
    ],
  },
  {
    label: "Insights",
    order: 4,
    children: [
      {
        label: "Analytics",
        order: 0,
        icon: "chart",
        children: [
          { label: "Overview", href: "/admin/analytics", order: 0, permission: "admin:analytics", icon: "chart" },
          {
            label: "Settings",
            href: "/admin/analytics/settings",
            order: 1,
            permission: "admin:analytics",
            icon: "settings",
          },
        ],
      },
      { label: "Feedback", href: "/admin/feedback", order: 1, permission: "admin:feedback", icon: "mail" },
      { label: "Creators", href: "/admin/creators", order: 2, permission: "admin:staff", icon: "users" },
      { label: "Logs", href: "/admin/audit-logs", order: 3, permission: "admin:audit", icon: "shield" },
    ],
  },
  {
    label: "Settings",
    order: 5,
    children: [
      { label: "Division settings", href: "/admin/settings", order: 0, permission: "admin:settings", icon: "settings" },
      { label: "Translations", href: "/admin/settings/translations", order: 1, permission: "admin:settings", icon: "file" },
      { label: "Ratings", href: "/admin/settings/ratings", order: 2, permission: "admin:settings", icon: "certificate" },
    ],
  },
];

const DEFAULT_FOOTER_MENU: MenuItemNode[] = [
  {
    label: "Division",
    order: 0,
    children: [
      { label: "Home", href: "/home", order: 0 },
      { label: "Events", href: "/events", order: 1 },
      { label: "Staff", href: "/staff", order: 2 },
    ],
  },
  {
    label: "Operations",
    order: 1,
    children: [
      { label: "Airports", href: "/airports", order: 0 },
      { label: "Airspace", href: "/airspace", order: 1 },
    ],
  },
  {
    label: "Resources",
    order: 2,
    children: [
      { label: "Documentation", href: "/documentation", order: 0 },
      { label: "Contact", href: "/contact", order: 1 },
    ],
  },
];

export const DEFAULT_MENUS: Record<MenuKey, MenuItemNode[]> = {
  public: DEFAULT_PUBLIC_MENU,
  admin: DEFAULT_ADMIN_MENU,
  footer: DEFAULT_FOOTER_MENU,
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
  const cached = unstable_cache(
    async () => {
      const menu = await prisma.menu.findUnique({
        where: { key: menuKey },
        include: { items: { orderBy: { order: "asc" } } },
      });

      if (!menu) {
        return DEFAULT_MENUS[menuKey];
      }

      return buildTree(menu.items);
    },
    [`menu:${menuKey}`],
    { revalidate: 300, tags: ["menu"] },
  );

  return cached();
};

export const getMenuAdminData = async (menuKey: MenuKey) => {
  return prisma.menu.findUnique({
    where: { key: menuKey },
    include: { items: { orderBy: { order: "asc" } } },
  });
};
