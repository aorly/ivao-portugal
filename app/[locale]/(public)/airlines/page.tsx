/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airlines" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/airlines`) },
  };
}

export default async function AirlinesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airlines" });

  const airlines = await prisma.airline.findMany({
    where: {
      OR: [{ countryId: "PT" }, { countryId: "pt" }],
    },
    orderBy: [{ name: "asc" }],
  });

  return (
    <main className="flex flex-col gap-10 pb-16">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <section className="relative overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,_var(--primary-soft)_0%,_transparent_70%)] opacity-80" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-[radial-gradient(circle,_rgba(249,204,44,0.25)_0%,_transparent_70%)] opacity-80" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <SectionHeader eyebrow={t("cardsEyebrow")} title={t("title")} description={t("description")} />
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">
                {t("statsTitle")}
              </p>
              <p className="mt-3 text-4xl font-semibold text-[color:var(--text-primary)]">{airlines.length}</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{t("statsDescription")}</p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-[color:var(--text-muted)]">
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1">
                  {t("totalLabel", { count: airlines.length })}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--text-muted)]">{t("cardsEyebrow")}</p>
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{t("cardsTitle")}</h2>
            </div>
            <span className="text-xs text-[color:var(--text-muted)]">{t("totalLabel", { count: airlines.length })}</span>
          </div>

          {airlines.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {airlines.map((airline) => (
                <div
                  key={airline.icao}
                  className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)] transition hover:-translate-y-1"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--primary-soft)_0%,_transparent_65%)]" />
                  </div>
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-4">
                        {airline.logoUrl || airline.logoDarkUrl ? (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                            <img
                              src={airline.logoUrl || airline.logoDarkUrl || ""}
                              alt=""
                              className="logo-light h-10 w-10 object-contain"
                            />
                            <img
                              src={airline.logoDarkUrl || airline.logoUrl || ""}
                              alt=""
                              className="logo-dark h-10 w-10 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[10px] text-[color:var(--text-muted)]">
                            N/A
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/${locale}/airlines/${airline.icao}`}
                            className="text-sm font-semibold text-[color:var(--text-primary)] transition group-hover:text-[color:var(--primary)]"
                          >
                            {airline.name}
                          </Link>
                          <p className="text-xs text-[color:var(--text-muted)]">{airline.callsign ?? "-"}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                        ICAO {airline.icao}
                      </span>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                      <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1">
                        IATA {airline.iata ?? "N/A"}
                      </span>
                      {airline.website ? (
                        <a
                          href={airline.website}
                          target="_blank"
                          rel="noreferrer"
                          className="max-w-[220px] truncate rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-[color:var(--primary)]"
                        >
                          {airline.website}
                        </a>
                      ) : (
                        <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1">
                          {t("noWebsite")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative mt-6 flex items-center justify-between text-xs">
                    <span className="text-[color:var(--text-muted)]">{t("cardFooter")}</span>
                    <Link
                      href={`/${locale}/airlines/${airline.icao}`}
                      className="font-semibold text-[color:var(--primary)]"
                    >
                      {t("cta")} -&gt;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
