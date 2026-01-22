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
    <main className="flex flex-col gap-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SectionHeader eyebrow={t("title")} title={t("title")} description={t("description")} />

        <div className="rounded-3xl bg-[color:var(--surface)] p-6 shadow-[var(--shadow-soft)]">
          {airlines.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                  <tr>
                    <th className="px-3 py-2 text-left">ICAO</th>
                    <th className="px-3 py-2 text-left">Airline</th>
                    <th className="px-3 py-2 text-left">Callsign</th>
                    <th className="px-3 py-2 text-left">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {airlines.map((airline) => (
                    <tr key={airline.icao}>
                      <td className="px-3 py-3 font-mono text-xs">{airline.icao}</td>
                      <td className="px-3 py-3">
                        <Link href={`/${locale}/airlines/${airline.icao}`} className="group flex items-center gap-3">
                          {airline.logoUrl || airline.logoDarkUrl ? (
                            <>
                              <img
                                src={airline.logoUrl || airline.logoDarkUrl || ""}
                                alt=""
                                className="logo-light h-14 w-14 rounded-2xl object-contain"
                              />
                              <img
                                src={airline.logoDarkUrl || airline.logoUrl || ""}
                                alt=""
                                className="logo-dark h-14 w-14 rounded-2xl object-contain"
                              />
                            </>
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] text-[10px] text-[color:var(--text-muted)]">
                              N/A
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-[color:var(--text-primary)] group-hover:text-[color:var(--primary)]">
                              {airline.name}
                            </p>
                            <p className="text-xs text-[color:var(--text-muted)]">{airline.iata ?? ""}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-[color:var(--text-muted)]">{airline.callsign ?? "-"}</td>
                      <td className="px-3 py-3">
                        {airline.website ? (
                          <a
                            href={airline.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[color:var(--primary)] underline"
                          >
                            {airline.website}
                          </a>
                        ) : (
                          <span className="text-[color:var(--text-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
