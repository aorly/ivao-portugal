export type AdminNavItem = {
  label: string;
  href: string; // relative to /{locale}
  description: string;
};

export type AdminNavSection = {
  title: string;
  description?: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    title: "Operations",
    description: "High-level control for events, exams, and training.",
    items: [
      { label: "Overview", href: "/admin", description: "Admin landing with quick shortcuts." },
      { label: "Events", href: "/admin/events", description: "Create, publish, and manage events." },
      { label: "Exams", href: "/admin/exams", description: "Review and edit exam slots and info." },
      { label: "Training", href: "/admin/training", description: "Handle requests, sessions, and notes." },
    ],
  },
  {
    title: "Airports",
    description: "Airport records, stands, frequencies, and MET data.",
    items: [
      { label: "Airports", href: "/admin/airports", description: "Browse and edit airport profiles." },
      { label: "Create airport", href: "/admin/airports/new", description: "Add a new airport entry." },
    ],
  },
  {
    title: "Airspace & data",
    description: "Geography, frequencies, and AIRAC imports.",
    items: [
      { label: "FIRs", href: "/admin/firs", description: "Manage FIRs and their geometry." },
      { label: "Airspace", href: "/admin/airspace", description: "ENR 2.1 segments and classes." },
      { label: "Frequencies", href: "/admin/frequencies", description: "Sector frequencies and bounds." },
      { label: "Transition levels", href: "/admin/transition-levels", description: "TA/TL bands by QNH range." },
      { label: "AIRAC data", href: "/admin/airac", description: "Fix/VOR/NDB imports and frequency boundaries." },
      { label: "Significant points", href: "/admin/significant-points", description: "VFR points dataset and resources." },
    ],
  },
  {
    title: "Content",
    description: "Static pages you can edit like a lightweight CMS.",
    items: [{ label: "Pages", href: "/admin/pages", description: "Create and edit public content pages." }],
  },
];

export const adminDetailRoutes: { path: string; description: string }[] = [
  { path: "/admin/airports/[id]", description: "Airport detail (stands, frequencies, charts)." },
  { path: "/admin/airports/[id]/stands", description: "Standalone stands editor for a given airport." },
  { path: "/admin/training/[id]", description: "Training record detail page." },
  { path: "/admin/training/requests/[id]", description: "Review and respond to a specific training request." },
];
