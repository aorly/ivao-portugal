"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type Locale, locales } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
};

export function LocaleToggle({ locale }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const otherLocales = locales.filter((l) => l !== locale);
  const primary = locale;
  const secondary = otherLocales[0] ?? locale;
  const currentPath = pathname || `/${primary}/home`;
  const nextPath = currentPath.startsWith(`/${primary}`)
    ? `/${secondary}${currentPath.slice(primary.length + 1)}`
    : `/${secondary}${currentPath.startsWith("/") ? "" : "/"}${currentPath}`;
  const query = searchParams?.toString();
  const href = query ? `${nextPath}?${query}` : nextPath;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-muted)]">
      <span className="rounded-full bg-[color:var(--surface-2)] px-3 py-1.5 text-[color:var(--text-primary)] font-semibold">
        {primary.toUpperCase()}
      </span>
      <Link
        className={cn(
          "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold",
          "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]",
        )}
        href={href}
        prefetch={false}
        onClick={() => {
          document.cookie = `preferred_locale=${secondary}; path=/; SameSite=Lax`;
        }}
      >
        {secondary.toUpperCase()}
      </Link>
    </div>
  );
}
