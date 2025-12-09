import Link from "next/link";
import { type Locale, locales } from "@/i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
};

export function LocaleToggle({ locale }: Props) {
  const otherLocales = locales.filter((l) => l !== locale);
  const primary = locale;
  const secondary = otherLocales[0] ?? locale;

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
        href={`/api/set-locale?locale=${secondary}&redirect=/${secondary}/home`}
        prefetch={false}
      >
        {secondary.toUpperCase()}
      </Link>
    </div>
  );
}
