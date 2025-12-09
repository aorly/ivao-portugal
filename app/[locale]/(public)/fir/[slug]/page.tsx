import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export default async function FirDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "fir" });

  const fir = await prisma.fir.findUnique({
    where: { slug },
    include: {
      airports: {
        select: { icao: true, name: true },
        orderBy: { icao: "asc" },
      },
    },
  });

  if (!fir) {
    return (
      <main className="flex flex-col gap-6">
        <SectionHeader eyebrow="FIR" title={slug} description="Not found" />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        eyebrow={t("title", { slug })}
        title={fir.name}
        description={t("body")}
      />
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("airports")}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {fir.airports.map((airport) => (
            <Link
              key={airport.icao}
              href={`/${locale}/airports/${airport.icao.toLowerCase()}`}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
            >
              {airport.icao} · {airport.name}
            </Link>
          ))}
          {fir.airports.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("description")}</p>
          ) : null}
        </div>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("atc")}</p>
        <p className="text-sm text-[color:var(--text-muted)]">{t("body")}</p>
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("flights")}</p>
        <p className="text-sm text-[color:var(--text-muted)]">{t("body")}</p>
      </Card>
    </main>
  );
}
