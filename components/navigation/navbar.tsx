import Image from "next/image";
import Link from "next/link";
import { type Locale } from "@/i18n";
import { LocaleToggle } from "@/components/navigation/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { type MenuItemNode } from "@/lib/menu";
import { Suspense, type JSX } from "react";
import { MessageSquare } from "lucide-react";

type Props = {
  locale: Locale;
  user?: { name?: string | null; vid?: string | null; role?: string | null };
  items: MenuItemNode[];
  allowedPermissions?: string[];
  isAdmin?: boolean;
  brandName?: string;
  logoUrl?: string;
  logoDarkUrl?: string;
  socialLinks?: {
    facebookUrl?: string | null;
    discordUrl?: string | null;
    instagramUrl?: string | null;
    xUrl?: string | null;
    forumUrl?: string | null;
  };
};

export function Navbar({
  locale,
  user,
  items,
  allowedPermissions = [],
  isAdmin,
  brandName,
  logoUrl,
  logoDarkUrl,
  socialLinks,
}: Props) {
  const role = user?.role ?? "USER";
  const lightLogoSrc = logoUrl || "/ivaopt.svg";
  const darkLogoSrc = logoDarkUrl || lightLogoSrc;
  const isDefaultLogo = !logoUrl;
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
    plane: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M3 12h8l5-5 2 2-4 3h7v2h-7l4 3-2 2-5-5H3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
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
  const isExternal = (href?: string | null) =>
    Boolean(href && /^(https?:\/\/|mailto:|tel:)/i.test(href));
  const isHttp = (href?: string | null) => Boolean(href && /^https?:\/\//i.test(href));
  const getHref = (href?: string | null) => (href ? (isExternal(href) ? href : `/${locale}${href}`) : "");
  const loginUrl = `/api/ivao/login?callbackUrl=${encodeURIComponent(`/${locale}/home`)}`;
  const logoutUrl = `/api/logout?callbackUrl=${encodeURIComponent(`/${locale}/home`)}`;
  const socialIcons: Record<string, JSX.Element> = {
    facebook: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" fill="currentColor" />
      </svg>
    ),
    discord: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" fill="currentColor" />
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" fill="currentColor" />
      </svg>
    ),
    x: (
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" fill="currentColor" />
      </svg>
    ),
    forum: <MessageSquare className="h-[18px] w-[18px]" aria-hidden="true" />,
  };
  const socialItems = [
    { key: "facebook", label: "Facebook", href: socialLinks?.facebookUrl ?? "" },
    { key: "discord", label: "Discord", href: socialLinks?.discordUrl ?? "" },
    { key: "instagram", label: "Instagram", href: socialLinks?.instagramUrl ?? "" },
    { key: "x", label: "X", href: socialLinks?.xUrl ?? "" },
    { key: "forum", label: "Forum", href: socialLinks?.forumUrl ?? "" },
  ].filter((item) => item.href);
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
    <div role="banner" className="relative z-50 rounded-2xl px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/${locale}/home`} className="flex items-center gap-3">
          {darkLogoSrc ? (
            <>
              <Image
                src={lightLogoSrc}
                alt={brandName || "IVAO Portugal"}
                width={320}
                height={112}
                sizes="(min-width: 1024px) 300px, 220px"
                className={`logo-light h-28 w-auto${isDefaultLogo ? " logo-default" : ""}`}
                priority
                fetchPriority="high"
              />
              <Image
                src={darkLogoSrc}
                alt={brandName || "IVAO Portugal"}
                width={320}
                height={112}
                sizes="(min-width: 1024px) 300px, 220px"
                className={`logo-dark h-28 w-auto${isDefaultLogo ? " logo-default" : ""}`}
                priority
                fetchPriority="high"
              />
            </>
          ) : (
            <Image
              src={lightLogoSrc}
              alt={brandName || "IVAO Portugal"}
              width={320}
              height={112}
              sizes="(min-width: 1024px) 300px, 220px"
              className={`h-28 w-auto${isDefaultLogo ? " logo-default" : ""}`}
              priority
              fetchPriority="high"
            />
          )}
        </Link>
        <nav className="hidden flex-wrap items-center gap-3 text-sm font-medium text-[color:var(--text-muted)] lg:flex">
          {visibleItems.map((item) => {
            const label = getLabel(item);
            if (item.children && item.children.length > 0) {
              return (
                <div key={item.id ?? label} className="relative group">
                  <div className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]">
                    {item.href ? (
                      isExternal(item.href) ? (
                        <a
                          href={item.href}
                          className="text-[color:inherit]"
                          target={isHttp(item.href) ? "_blank" : undefined}
                          rel={isHttp(item.href) ? "noreferrer" : undefined}
                        >
                          {label}
                        </a>
                      ) : (
                        <Link href={getHref(item.href)} className="text-[color:inherit]">
                          {label}
                        </Link>
                      )
                    ) : (
                      <span>{label}</span>
                    )}
                    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 w-[min(230px,90vw)] -translate-x-1/2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/95 p-3 text-xs text-[color:var(--text-primary)] opacity-0 shadow-[var(--shadow-soft)] backdrop-blur transition group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    <div className={`grid gap-4 ${item.href ? "lg:grid-cols-[220px_1fr]" : ""}`}>
                      {item.href ? (
                        <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
                          <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Overview</p>
                          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{label}</p>
                          {getDescription(item) ? (
                            <p className="mt-1 text-xs text-[color:var(--text-muted)]">{getDescription(item)}</p>
                          ) : null}
                          {item.href ? (
                            isExternal(item.href) ? (
                              <a
                                href={item.href}
                                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--primary)]"
                                target={isHttp(item.href) ? "_blank" : undefined}
                                rel={isHttp(item.href) ? "noreferrer" : undefined}
                              >
                                View section
                                <span aria-hidden="true">-&gt;</span>
                              </a>
                            ) : (
                              <Link
                                href={getHref(item.href)}
                                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--primary)]"
                              >
                                View section
                                <span aria-hidden="true">-&gt;</span>
                              </Link>
                            )
                          ) : null}
                        </div>
                      ) : null}
                      <div
                        className={[
                          "grid gap-1.5",
                          item.children.length > 10
                            ? "grid-cols-3"
                            : item.children.length > 6
                              ? "grid-cols-2"
                              : "grid-cols-1",
                        ].join(" ")}
                      >
                        {chunkColumns(item.children).map((column, columnIndex) => (
                          <div key={`${item.id ?? label}-col-${columnIndex}`} className="grid gap-0.5">
                            {column.map((child) => {
                              const childLabel = getLabel(child);
                              const childDescription = getDescription(child);
                              return isExternal(child.href) ? (
                                <a
                                  key={child.id ?? childLabel}
                                  href={child.href ?? ""}
                                  className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition hover:bg-[color:var(--surface-3)]"
                                  target={isHttp(child.href) ? "_blank" : undefined}
                                  rel={isHttp(child.href) ? "noreferrer" : undefined}
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] transition group-hover:border-[color:var(--primary)] group-hover:text-[color:var(--text-primary)]">
                                    {resolveIcon(child.icon)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-[12px] font-semibold text-[color:var(--text-primary)]">
                                      {childLabel}
                                    </span>
                                    {childDescription ? (
                                      <span className="block truncate text-[10px] text-[color:var(--text-muted)]">
                                        {childDescription}
                                      </span>
                                    ) : null}
                                  </span>
                                </a>
                              ) : (
                                <Link
                                  key={child.id ?? childLabel}
                                  href={getHref(child.href)}
                                  className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition hover:bg-[color:var(--surface-3)]"
                                >
                                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)] transition group-hover:border-[color:var(--primary)] group-hover:text-[color:var(--text-primary)]">
                                    {resolveIcon(child.icon)}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block truncate text-[12px] font-semibold text-[color:var(--text-primary)]">
                                      {childLabel}
                                    </span>
                                    {childDescription ? (
                                      <span className="block truncate text-[10px] text-[color:var(--text-muted)]">
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
                </div>
              );
            }

            return isExternal(item.href) ? (
              <a
                key={item.id ?? label}
                href={item.href ?? ""}
                className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
                target={isHttp(item.href) ? "_blank" : undefined}
                rel={isHttp(item.href) ? "noreferrer" : undefined}
              >
                {label}
              </a>
            ) : (
              <Link
                key={item.id ?? label}
                href={getHref(item.href)}
                className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          {socialItems.length > 0 ? (
            <div className="hidden items-center gap-2 lg:flex">
              {socialItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)] transition hover:border-[color:var(--primary)] hover:text-[color:var(--text-primary)]"
                  target={isHttp(item.href) ? "_blank" : undefined}
                  rel={isHttp(item.href) ? "noreferrer" : undefined}
                  aria-label={item.label}
                >
                  {socialIcons[item.key] ?? socialIcons.forum}
                </a>
              ))}
            </div>
          ) : null}
          {user ? (
            <details className="group relative">
              <summary className="flex list-none items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-4 py-2 text-xs font-semibold text-[color:var(--text-primary)]">
                <span>{user.name ?? user.vid}</span>
                <svg viewBox="0 0 16 16" className="h-3 w-3 text-[color:var(--text-muted)]" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-2 text-xs text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]">
                <Link
                  href={`/${locale}/profile`}
                  className="block rounded-lg px-3 py-2 hover:bg-[color:var(--surface-3)]"
                >
                  {locale === "pt" ? "Perfil" : "Profile"}
                </Link>
                <a
                  href={logoutUrl}
                  className="mt-1 block rounded-lg px-3 py-2 text-[color:var(--danger)] hover:bg-[color:var(--surface-3)]"
                >
                  {locale === "pt" ? "Sair" : "Logout"}
                </a>
              </div>
            </details>
          ) : (
            <Link
              href={loginUrl}
              className="rounded-lg bg-[color:var(--primary)] px-3 py-2 text-xs font-semibold !text-white transition hover:opacity-90"
            >
              {locale === "pt" ? "Entrar" : "Login"}
            </Link>
          )}
          <ThemeToggle />
          <Suspense fallback={null}>
            <LocaleToggle locale={locale} />
          </Suspense>
        </div>
      </div>
      <details className="mt-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/80 px-4 py-3 text-sm text-[color:var(--text-muted)] lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-[color:var(--text-primary)]">
          <span>Menu</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </summary>
        <div className="mt-3 grid gap-2">
          {visibleItems.map((item) => {
            const label = getLabel(item);
            if (item.children && item.children.length > 0) {
              return (
                <details key={item.id ?? label} className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2">
                  <summary className="cursor-pointer text-sm font-semibold text-[color:var(--text-primary)]">
                    {label}
                  </summary>
                  <div className="mt-2 grid gap-1">
                    {item.children.map((child) => {
                      const childLabel = getLabel(child);
                      return isExternal(child.href) ? (
                        <a
                          key={child.id ?? childLabel}
                          href={child.href ?? ""}
                          className="rounded-lg px-2 py-1 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--surface-3)]"
                          target={isHttp(child.href) ? "_blank" : undefined}
                          rel={isHttp(child.href) ? "noreferrer" : undefined}
                        >
                          {childLabel}
                        </a>
                      ) : (
                        <Link
                          key={child.id ?? childLabel}
                          href={getHref(child.href)}
                          className="rounded-lg px-2 py-1 text-sm text-[color:var(--text-primary)] hover:bg-[color:var(--surface-3)]"
                        >
                          {childLabel}
                        </Link>
                      );
                    })}
                  </div>
                </details>
              );
            }

            return isExternal(item.href) ? (
              <a
                key={item.id ?? label}
                href={item.href ?? ""}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                target={isHttp(item.href) ? "_blank" : undefined}
                rel={isHttp(item.href) ? "noreferrer" : undefined}
              >
                {label}
              </a>
            ) : (
              <Link
                key={item.id ?? label}
                href={getHref(item.href)}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                {label}
              </Link>
            );
          })}
        </div>
        {socialItems.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {socialItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-muted)]"
                target={isHttp(item.href) ? "_blank" : undefined}
                rel={isHttp(item.href) ? "noreferrer" : undefined}
                aria-label={item.label}
              >
                {socialIcons[item.key] ?? socialIcons.forum}
              </a>
            ))}
          </div>
        ) : null}
      </details>
    </div>
  );
}


