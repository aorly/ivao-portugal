let prisma;

const PUBLIC_MENU = [
  {
    label: "Home",
    labelPt: "Inicio",
    href: "/home",
    order: 0,
    icon: "home",
    description: "Division highlights and live ops.",
  },
  {
    label: "Operations",
    labelPt: "Operacoes",
    order: 1,
    icon: "layers",
    description: "Events, airports, and airspace tools.",
    children: [
      {
        label: "Events",
        labelPt: "Eventos",
        href: "/events",
        order: 0,
        icon: "calendar",
        description: "Upcoming and past events.",
      },
      {
        label: "Airports",
        labelPt: "Aeroportos",
        href: "/airports",
        order: 1,
        icon: "map",
        description: "Browse airports and layouts.",
      },
      {
        label: "Timetable",
        labelPt: "Horarios",
        href: "/airports/timetable",
        order: 2,
        icon: "clock",
        description: "Live airport timetable.",
      },
      {
        label: "Airspace",
        labelPt: "Espaco aereo",
        href: "/airspace",
        order: 3,
        icon: "globe",
        description: "Airspace classes and sectors.",
      },
      {
        label: "Significant points",
        labelPt: "Pontos significativos",
        href: "/significant-points",
        order: 4,
        icon: "map-pin",
        description: "VFR points and coordinates.",
      },
    ],
  },
  {
    label: "Community",
    labelPt: "Comunidade",
    order: 2,
    icon: "users",
    description: "Division staff and community.",
    children: [
      {
        label: "Staff",
        labelPt: "Staff",
        href: "/staff",
        order: 0,
        icon: "users",
        description: "Division team.",
      },
    ],
  },
  {
    label: "Resources",
    labelPt: "Recursos",
    order: 3,
    icon: "file",
    description: "Guides and manuals.",
    children: [
      {
        label: "Documentation",
        labelPt: "Documentacao",
        href: "/documentation",
        order: 0,
        icon: "book",
        description: "Guides and manuals.",
      },
    ],
  },
  {
    label: "Admin",
    labelPt: "Admin",
    href: "/admin",
    order: 4,
    permission: "staff-only",
    icon: "shield",
    description: "Staff-only tools.",
  },
];

const ADMIN_MENU = [
  {
    label: "Overview",
    order: 0,
    children: [{ label: "Overview", href: "/admin", order: 0, icon: "home" }],
  },
  {
    label: "Content",
    order: 1,
    children: [
      { label: "Pages", href: "/admin/pages", order: 0, permission: "admin:pages", icon: "file" },
      { label: "Create page", href: "/admin/pages/new", order: 1, permission: "admin:pages", icon: "plus" },
      { label: "Page categories", href: "/admin/page-categories", order: 2, permission: "admin:pages", icon: "file" },
      { label: "Menus", href: "/admin/menus", order: 3, permission: "admin:menus", icon: "menu" },
      { label: "Public menu", href: "/admin/menus/public", order: 4, permission: "admin:menus", icon: "menu" },
      { label: "Admin menu", href: "/admin/menus/admin", order: 5, permission: "admin:menus", icon: "menu" },
      { label: "Footer menu", href: "/admin/menus/footer", order: 6, permission: "admin:menus", icon: "menu" },
      { label: "Staff", href: "/admin/staff", order: 7, permission: "admin:staff", icon: "users" },
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
      { label: "Logs", href: "/admin/audit-logs", order: 2, permission: "admin:audit", icon: "shield" },
    ],
  },
  {
    label: "Settings",
    order: 5,
    children: [
      { label: "Division settings", href: "/admin/settings", order: 0, permission: "admin:settings", icon: "settings" },
      { label: "Translations", href: "/admin/settings/translations", order: 1, permission: "admin:settings", icon: "file" },
    ],
  },
];

const FOOTER_MENU = [
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
      { label: "Timetable", href: "/airports/timetable", order: 1 },
      { label: "Airspace", href: "/airspace", order: 2 },
      { label: "Significant points", href: "/significant-points", order: 3 },
    ],
  },
  {
    label: "Resources",
    order: 2,
    children: [{ label: "Documentation", href: "/documentation", order: 0 }],
  },
];

const MENUS = [
  { key: "public", title: "Public", items: PUBLIC_MENU },
  { key: "admin", title: "Admin", items: ADMIN_MENU },
  { key: "footer", title: "Footer", items: FOOTER_MENU },
];

async function createItems(menuId, items, parentId = null) {
  for (const item of items) {
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
        order: item.order ?? 0,
        enabled: item.enabled ?? true,
        permission: item.permission ?? null,
      },
    });
    if (item.children && item.children.length > 0) {
      await createItems(menuId, item.children, created.id);
    }
  }
}

async function rebuildMenu(menu) {
  const existing = await prisma.menu.findUnique({ where: { key: menu.key } });
  if (existing) {
    await prisma.menuItem.deleteMany({ where: { menuId: existing.id } });
    await prisma.menu.update({
      where: { id: existing.id },
      data: { title: menu.title },
    });
  } else {
    await prisma.menu.create({
      data: { key: menu.key, title: menu.title },
    });
  }

  const current = await prisma.menu.findUnique({ where: { key: menu.key } });
  await createItems(current.id, menu.items);
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");

  const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  try {
    for (const menu of MENUS) {
      await rebuildMenu(menu);
    }
    console.log("Menus rebuilt.");
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
