export type AdminNavItem = {
  label: string;
  href: string; // relative to /{locale}
  description: string;
  permission?: string;
};

export type AdminNavSection = {
  title: string;
  description?: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Dashboard",
    description: "Quick access to the core admin areas.",
    items: [{ label: "Overview", href: "/admin", description: "Admin landing with quick shortcuts." }],
  },
  {
    title: "Content",
    description: "Public content and staff access.",
    items: [
      { label: "Pages", href: "/admin/pages", description: "Create and edit public content pages.", permission: "admin:pages" },
      { label: "Create page", href: "/admin/pages/new", description: "Start a new CMS page draft.", permission: "admin:pages" },
      {
        label: "Page categories",
        href: "/admin/page-categories",
        description: "Manage CMS category routes.",
        permission: "admin:pages",
      },
      { label: "Menus", href: "/admin/menus", description: "Edit public, admin, and footer menus.", permission: "admin:menus" },
      { label: "Public menu", href: "/admin/menus/public", description: "Manage the public navigation tree.", permission: "admin:menus" },
      { label: "Admin menu", href: "/admin/menus/admin", description: "Manage the admin navigation tree.", permission: "admin:menus" },
      { label: "Footer menu", href: "/admin/menus/footer", description: "Manage footer navigation links.", permission: "admin:menus" },
      { label: "Staff", href: "/admin/staff", description: "Assign staff positions and permissions.", permission: "admin:staff" },
    ],
  },
  {
    title: "Operations",
    description: "Events workflow and calendar.",
    items: [
      { label: "Events", href: "/admin/events", description: "Create, publish, and manage events.", permission: "admin:events" },
      { label: "Calendar", href: "/admin/calendar", description: "Sync training/exam calendar feed.", permission: "admin:events" },
    ],
  },
  {
    title: "Infrastructure",
    description: "Airports, airspace, FIRs, and data imports.",
    items: [
      { label: "Airports", href: "/admin/airports", description: "Browse and edit airport profiles.", permission: "admin:airports" },
      { label: "Create airport", href: "/admin/airports/new", description: "Add a new airport entry.", permission: "admin:airports" },
      { label: "FIRs", href: "/admin/firs", description: "Manage FIRs and their geometry.", permission: "admin:firs" },
      { label: "Frequencies", href: "/admin/frequencies", description: "Sector frequencies and bounds.", permission: "admin:frequencies" },
      { label: "Airspace", href: "/admin/airspace", description: "ENR 2.1 segments and classes.", permission: "admin:airspace" },
      { label: "Transition levels", href: "/admin/transition-levels", description: "TA/TL bands by QNH range.", permission: "admin:transition-levels" },
      { label: "AIRAC data", href: "/admin/airac", description: "Fix/VOR/NDB imports and frequency boundaries.", permission: "admin:airac" },
      { label: "Significant points", href: "/admin/significant-points", description: "VFR points dataset and resources.", permission: "admin:significant-points" },
    ],
  },
  {
    title: "Insights",
    description: "Traffic and CTA performance across the site.",
    items: [
      { label: "Analytics", href: "/admin/analytics", description: "Page views and CTA clicks.", permission: "admin:analytics" },
      { label: "Analytics settings", href: "/admin/analytics/settings", description: "Configure GA4, Umami, and more.", permission: "admin:analytics" },
      { label: "Logs", href: "/admin/audit-logs", description: "Staff audit activity.", permission: "admin:audit" },
    ],
  },
  {
    title: "Settings",
    description: "Division-wide configuration.",
    items: [
      { label: "Division settings", href: "/admin/settings", description: "Division branding and metadata.", permission: "admin:settings" },
      { label: "Translations", href: "/admin/settings/translations", description: "Edit locale JSON messages.", permission: "admin:settings" },
    ],
  },
];

export const adminDetailRoutes: { path: string; description: string }[] = [
  { path: "/admin/airports/[id]", description: "Airport detail (stands, frequencies, charts)." },
  { path: "/admin/airports/[id]/stands", description: "Standalone stands editor for a given airport." },
  { path: "/admin/pages/[slug]", description: "CMS page editor for a specific slug." },
];
