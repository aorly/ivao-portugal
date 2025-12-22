import Link from "next/link";
import { type Locale } from "@/i18n";
import { LocaleToggle } from "@/components/navigation/locale-toggle";
import { type MenuItemNode } from "@/lib/menu";

type Props = {
  locale: Locale;
  user?: { name?: string | null; vid?: string | null; role?: string | null };
  items: MenuItemNode[];
  allowedPermissions?: string[];
  isAdmin?: boolean;
};

export function Navbar({ locale, user, items, allowedPermissions = [], isAdmin }: Props) {
  const role = user?.role ?? "USER";
  const canSee = (permission?: string | null) => {
    if (!permission) return true;
    if (permission === "staff-only") return ["ADMIN", "STAFF"].includes(role);
    return Boolean(isAdmin) || allowedPermissions.includes(permission);
  };
  const getLabel = (item: MenuItemNode) =>
    locale === "pt" && item.labelPt ? item.labelPt : item.label;
  const getDescription = (item: MenuItemNode) =>
    locale === "pt" && item.descriptionPt ? item.descriptionPt : item.description;
  const iconMap: Record<string, JSX.Element> = {
    calendar: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M8 3v3M16 3v3M4 9h16M6 6h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    map: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M9 5 3 7v12l6-2 6 2 6-2V5l-6 2-6-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 5v12M15 7v12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 6v6l4 2M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    globe: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3.5 12h17M12 3a12 12 0 0 1 0 18M12 3a12 12 0 0 0 0 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    training: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M8 10.5v5l4 2 4-2v-5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M8 13a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 20a5 5 0 0 1 10 0M16 11a3 3 0 1 0-3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    file: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 19h16M7 16V9m5 7V6m5 10v-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    settings: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="m12 3 1.2 2.4 2.6.6-.8 2.4 1.8 2-1.8 2 .8 2.4-2.6.6L12 21l-1.2-2.4-2.6-.6.8-2.4-1.8-2 1.8-2-.8-2.4 2.6-.6L12 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    radio: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 10h16v8H4zM8 10l8-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    layers: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="m12 4 8 4-8 4-8-4 8-4Zm0 8 8 4-8 4-8-4 8-4Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    levels: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 7h10M4 12h16M4 17h12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    database: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <ellipse cx="12" cy="6" rx="7" ry="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    "map-pin": (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M12 21s6-6.3 6-11a6 6 0 1 0-12 0c0 4.7 6 11 6 11Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    certificate: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M6 4h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 18l3-2 3 2v2l-3-1.5L9 20z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 11 12 4l8 7v9H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    dot: (
      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    ),
  };
  const resolveIcon = (name?: string | null) => iconMap[name ?? ""] ?? iconMap.dot;
  const visibleItems = items
    .filter((item) => item.enabled !== false && canSee(item.permission))
    .map((item) => ({
      ...item,
      children: (item.children ?? []).filter(
        (child) => child.enabled !== false && canSee(child.permission) && child.href,
      ),
    }))
    .filter((item) => item.href || (item.children && item.children.length > 0));
  const chunkColumns = (children: MenuItemNode[]) => {
    const total = children.length;
    const columns = total > 10 ? 3 : total > 6 ? 2 : 1;
    const chunkSize = Math.ceil(total / columns);
    return Array.from({ length: columns }, (_, index) =>
      children.slice(index * chunkSize, index * chunkSize + chunkSize),
    );
  };

  return (
    <header className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/${locale}/home`} className="flex items-center gap-3">
          <img src="/ivaopt.svg" alt="IVAO Portugal" className="h-12 w-auto" loading="lazy" />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-[color:var(--text-muted)]">
          {visibleItems.map((item) => {
            const label = getLabel(item);
            if (item.children && item.children.length > 0) {
              return (
                <div key={item.id ?? label} className="relative group">
                  <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]">
                    {item.href ? (
                      <Link href={`/${locale}${item.href}`} className="text-[color:inherit]">
                        {label}
                      </Link>
                    ) : (
                      <span>{label}</span>
                    )}
                    <span className="text-xs">v</span>
                  </div>
                  <div className="pointer-events-none absolute left-0 top-full z-20 min-w-[240px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 pt-5 text-xs text-[color:var(--text-primary)] opacity-0 shadow-[var(--shadow-soft)] transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    <div
                      className={[
                        "grid gap-2",
                        item.children.length > 10
                          ? "grid-cols-3"
                          : item.children.length > 6
                            ? "grid-cols-2"
                            : "grid-cols-1",
                      ].join(" ")}
                    >
                      {chunkColumns(item.children).map((column, columnIndex) => (
                        <div key={`${item.id ?? label}-col-${columnIndex}`} className="grid gap-1">
                          {column.map((child) => {
                            const childLabel = getLabel(child);
                            const childDescription = getDescription(child);
                            return (
                              <Link
                                key={child.id ?? childLabel}
                                href={`/${locale}${child.href}`}
                                className="group flex items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-[color:var(--surface-3)]"
                              >
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] transition group-hover:border-[color:var(--primary)] group-hover:text-[color:var(--text-primary)]">
                                  {resolveIcon(child.icon)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-[13px] font-semibold text-[color:var(--text-primary)]">
                                    {childLabel}
                                  </span>
                                  {childDescription ? (
                                    <span className="block truncate text-[11px] text-[color:var(--text-muted)]">
                                      {childDescription}
                                    </span>
                                  ) : null}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id ?? label}
                href={`/${locale}${item.href}`}
                className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-4 py-2 text-xs text-[color:var(--text-primary)]">
              <p className="font-semibold leading-tight">{user.name ?? user.vid}</p>
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="rounded-lg bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            >
              {locale === "pt" ? "Entrar" : "Login"}
            </Link>
          )}
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
