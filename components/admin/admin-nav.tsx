"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminDetailRoutes } from "@/lib/admin-nav";
import { type MenuItemNode } from "@/lib/menu";
import type { JSX } from "react";

type Props = {
  locale: string;
  items: MenuItemNode[];
  allowedPermissions?: string[];
  isAdmin?: boolean;
};

export function AdminNav({ locale, items, allowedPermissions = [], isAdmin }: Props) {
  const pathname = usePathname();
  const canSee = (permission?: string | null) => !permission || isAdmin || allowedPermissions.includes(permission);
  const getLabel = (item: MenuItemNode) =>
    locale === "pt" && item.labelPt ? item.labelPt : item.label;
  const iconMap: Record<string, JSX.Element> = {
    home: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 11 12 4l8 7v9H4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
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
    certificate: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M6 4h12v10H6z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 18l3-2 3 2v2l-3-1.5L9 20z" fill="none" stroke="currentColor" strokeWidth="1.5" />
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
    menu: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h10" fill="none" stroke="currentColor" strokeWidth="1.5" />
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
  };
  const resolveIcon = (name?: string | null) => iconMap[name ?? ""] ?? iconMap.home;

  const visibleSections = items
    .map((item) => {
      if (item.enabled === false) return null;
      const children = (item.children ?? []).filter(
        (child) => child.enabled !== false && canSee(child.permission),
      );
      const canShowSelf = canSee(item.permission) && Boolean(item.href);
      if (children.length === 0 && !canShowSelf) return null;
      return {
        id: item.id ?? item.label,
        title: getLabel(item),
        href: item.href,
        items: children.length
          ? children
          : item.href
            ? [{ ...item, children: [] }]
            : [],
      };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return (
    <aside className="flex w-72 flex-col border-r border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Admin</p>
        <span className="text-[10px] text-[color:var(--text-muted)]">/{locale}</span>
      </div>
      <nav className="mt-6 flex-1 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const href = item.href ? `/${locale}${item.href}` : `/${locale}/admin`;
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={item.href ?? item.label}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] transition hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]",
                      isActive &&
                        "bg-[color:var(--surface-2)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]",
                    )}
                    title={getLabel(item)}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)]",
                        isActive ? "bg-[color:var(--surface-3)]" : "bg-[color:var(--surface-2)]",
                      )}
                    >
                      {resolveIcon(item.icon)}
                    </span>
                    <span className="truncate">{getLabel(item)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-2 border-t border-[color:var(--border)] pt-4 text-[11px] text-[color:var(--text-muted)]">
        <p className="font-semibold uppercase tracking-[0.2em]">Routes</p>
        <div className="space-y-1">
          {adminDetailRoutes.map((route) => (
            <p key={route.path} className="truncate" title={route.description}>
              /{locale}
              {route.path}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
