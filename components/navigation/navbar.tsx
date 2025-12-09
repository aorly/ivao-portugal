import Image from "next/image";
import Link from "next/link";
import { type Locale } from "@/i18n";
import { LocaleToggle } from "@/components/navigation/locale-toggle";

type Props = {
  locale: Locale;
  user?: { name?: string | null; vid?: string | null };
};

export function Navbar({ locale, user }: Props) {
  const labels =
    locale === "pt"
      ? { home: "Início", events: "Eventos", training: "Treino", admin: "Admin", signedIn: "Sessão" }
      : { home: "Home", events: "Events", training: "Training", admin: "Admin", signedIn: "Signed in" };
  return (
    <header className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/${locale}/home`} className="flex items-center gap-3">
          <img src="/ivaopt.svg" alt="IVAO Portugal" className="h-12 w-auto" loading="lazy" />
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-[color:var(--text-muted)]">
          <Link
            href={`/${locale}/home`}
            className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
          >
            {labels.home}
          </Link>
          <Link
            href={`/${locale}/events`}
            className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
          >
            {labels.events}
          </Link>
          <Link
            href={`/${locale}/training`}
            className="rounded-lg px-3 py-1.5 transition hover:bg-[color:var(--surface-3)] hover:text-[color:var(--text-primary)]"
          >
            {labels.training}
          </Link>
          <Link
            href={`/${locale}/admin/training`}
            className="rounded-lg px-3 py-1.5 text-[color:var(--primary)] transition hover:bg-[color:var(--surface-3)]"
          >
            {labels.admin}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-4 py-2 text-xs text-[color:var(--text-primary)]">
              <p className="font-semibold leading-tight">{user.name ?? user.vid}</p>
            </div>
          ) : null}
          <LocaleToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
