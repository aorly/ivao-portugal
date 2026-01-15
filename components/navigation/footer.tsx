/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { type Locale } from "@/i18n";
import { type MenuItemNode } from "@/lib/menu";

type Props = {
  locale: Locale;
  items: MenuItemNode[];
  allowedPermissions?: string[];
  isAdmin?: boolean;
  role?: string | null;
  brandName?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  tagline?: string;
  countries?: string;
  supportEmail?: string;
  websiteUrl?: string;
};

export function Footer({
  locale,
  items,
  allowedPermissions = [],
  isAdmin,
  role,
  brandName,
  logoUrl,
  logoDarkUrl,
  tagline,
  countries,
  supportEmail,
  websiteUrl,
}: Props) {
  const normalizedRole = role ?? (isAdmin ? "ADMIN" : "USER");
  const canSee = (permission?: string | null) => {
    if (!permission) return true;
    if (permission === "staff-only") return ["ADMIN", "STAFF"].includes(normalizedRole);
    return Boolean(isAdmin) || allowedPermissions.includes(permission);
  };
  const getLabel = (item: MenuItemNode) =>
    locale === "pt" && item.labelPt ? item.labelPt : item.label;
  const isExternal = (href?: string | null) =>
    Boolean(href && /^(https?:\/\/|mailto:|tel:)/i.test(href));
  const isHttp = (href?: string | null) => Boolean(href && /^https?:\/\//i.test(href));
  const getHref = (href?: string | null) => (href ? (isExternal(href) ? href : `/${locale}${href}`) : "");

  const visibleItems = items
    .filter((item) => item.enabled !== false && canSee(item.permission))
    .map((item) => ({
      ...item,
      children: (item.children ?? []).filter(
        (child) => child.enabled !== false && canSee(child.permission) && child.href,
      ),
    }))
    .filter((item) => item.href || (item.children && item.children.length > 0));

  const columns = visibleItems.slice(0, 3);

  return (
    <footer className="text-sm text-[color:var(--text-muted)]">
      <div className="rounded-3xl bg-[color:var(--surface-2)]/40 p-6">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
        <div className="space-y-3">
          <Link href={`/${locale}/home`} className="inline-flex items-center gap-3 text-[color:var(--text-primary)]">
            {logoDarkUrl ? (
              <>
                <img
                  src={logoUrl || "/ivaopt.svg"}
                  alt={brandName || "IVAO Portugal"}
                  className="logo-light h-10 w-auto"
                  loading="lazy"
                />
                <img
                  src={logoDarkUrl}
                  alt={brandName || "IVAO Portugal"}
                  className="logo-dark h-10 w-auto"
                  loading="lazy"
                />
              </>
            ) : (
              <img src={logoUrl || "/ivaopt.svg"} alt={brandName || "IVAO Portugal"} className="h-10 w-auto" loading="lazy" />
            )}
          </Link>
          <p className="text-sm text-[color:var(--text-muted)]">
            {tagline || "IVAO Portugal is the division for virtual aviation in Portugal, providing events and ATC ops."}
          </p>
          {countries ? <p className="text-xs text-[color:var(--text-muted)]">Countries: {countries}</p> : null}
          <div className="flex flex-wrap gap-3 text-xs text-[color:var(--text-muted)]">
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="hover:text-[color:var(--text-primary)]">
                {supportEmail}
              </a>
            ) : null}
            {websiteUrl ? (
              <a href={websiteUrl} className="hover:text-[color:var(--text-primary)]">
                {websiteUrl}
              </a>
            ) : null}
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {columns.map((item) => (
            <div key={item.id ?? item.label} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-primary)]">
                {getLabel(item)}
              </p>
              <ul className="space-y-2 text-sm">
                {(item.children?.length ? item.children : [item]).map((child) =>
                  child.href ? (
                    <li key={child.id ?? child.label}>
                      {isExternal(child.href) ? (
                        <a
                          href={child.href ?? ""}
                          className="text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                          target={isHttp(child.href) ? "_blank" : undefined}
                          rel={isHttp(child.href) ? "noreferrer" : undefined}
                        >
                          {getLabel(child)}
                        </a>
                      ) : (
                        <Link
                          href={getHref(child.href)}
                          className="text-[color:var(--text-muted)] transition hover:text-[color:var(--text-primary)]"
                        >
                          {getLabel(child)}
                        </Link>
                      )}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          ))}
        </div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border)] pt-4 text-xs">
        <span>© {new Date().getFullYear()} IVAO Portugal. All rights reserved.</span>
        <Link href={`/${locale}/home`} className="hover:text-[color:var(--text-primary)]">
          Back to home
        </Link>
      </div>
    </footer>
  );
}
