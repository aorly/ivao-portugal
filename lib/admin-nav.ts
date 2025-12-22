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
    title: "Overview",
    description: "Quick access to the core admin areas.",
    items: [{ label: "Overview", href: "/admin", description: "Admin landing with quick shortcuts." }],
  },
  {
    title: "Operations",
    description: "Events, exams, and training workflows.",
    items: [
      { label: "Events", href: "/admin/events", description: "Create, publish, and manage events.", permission: "admin:events" },
      { label: "Training", href: "/admin/training", description: "Handle requests, sessions, and notes.", permission: "admin:training" },
      { label: "Exams", href: "/admin/exams", description: "Review and edit exam slots and info.", permission: "admin:exams" },
    ],
  },
  {
    title: "Content",
    description: "Public content and staff access.",
    items: [
      { label: "Pages", href: "/admin/pages", description: "Create and edit public content pages.", permission: "admin:pages" },
      { label: "Staff", href: "/admin/staff", description: "Assign staff positions and permissions.", permission: "admin:staff" },
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
    ],
  },
];

export const adminDetailRoutes: { path: string; description: string }[] = [
  { path: "/admin/airports/[id]", description: "Airport detail (stands, frequencies, charts)." },
  { path: "/admin/airports/[id]/stands", description: "Standalone stands editor for a given airport." },
  { path: "/admin/training/[id]", description: "Training record detail page." },
  { path: "/admin/training/requests/[id]", description: "Review and respond to a specific training request." },
];
