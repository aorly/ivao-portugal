import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { loadAirspaceSegments } from "@/lib/airspace";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airspace" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/airspace`) },
  };
}

export default async function AirspacePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "airspace" });
  const fetchSegments = unstable_cache(loadAirspaceSegments, ["public-airspace-segments"], { revalidate: 600 });
  const segments = await fetchSegments();

  const boundaryIds = segments.map((s) => s.boundaryId).filter(Boolean) as string[];
  const fetchBoundaries = unstable_cache(
    async (ids: string[]) =>
      prisma.frequencyBoundary.findMany({
        where: { id: { in: ids } },
        include: { atcFrequency: true },
      }),
    ["public-airspace-boundaries"],
    { revalidate: 600 },
  );
  const boundaries = boundaryIds.length ? await fetchBoundaries(boundaryIds) : [];
  const boundaryMap = new Map(
    boundaries.map((b) => [
      b.id,
      {
        label: `${b.atcFrequency.station} ${b.atcFrequency.frequency}`,
        station: b.atcFrequency.station,
        frequency: b.atcFrequency.frequency,
      },
    ]),
  );

  const anchors = segments.map((item) => ({ id: item.id, title: item.title }));

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          action={
            <a
              href="https://ais.nav.pt/wp-content/uploads/AIS_Files/eAIP_Current/eAIP_Online/eAIP/html/eAIP/LP-ENR-2.1-en-PT.html#ENR-2.1"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-[color:var(--primary)] hover:underline"
            >
              {t("source")}
            </a>
          }
        />

        {segments.length === 0 ? (
          <Card className="border border-[color:var(--border)] p-4">
            <p className="text-sm text-[color:var(--text-muted)]">
              No airspace segments published yet. Check back after the next data update.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {segments.map((item) => (
              <Card id={item.id} key={item.id} className="space-y-3 border border-[color:var(--border)] p-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("card.name")}</p>
                  <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{item.title}</h2>
                  <p className="text-sm text-[color:var(--text-muted)]">{item.lateralLimits}</p>
                </div>

                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)]">
                  <div className="grid grid-cols-[1.1fr_1fr_.9fr] items-center gap-2 border-b border-[color:var(--border)] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                    <span>{t("table.band")}</span>
                    <span>{t("table.class")}</span>
                    <span>{t("table.notes")}</span>
                  </div>
                  <div className="divide-y divide-[color:var(--border)]">
                    {item.bands.map((band, idx) => (
                      <div key={`${item.id}-${idx}`} className="grid grid-cols-[1.1fr_1fr_.9fr] gap-2 px-3 py-2 text-sm">
                        <span className="text-[color:var(--text-primary)]">
                          {band.from} → {band.to}
                        </span>
                        <span className="font-semibold text-[color:var(--primary)]">{band.class}</span>
                        <span className="text-[color:var(--text-muted)]">{band.note ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-sm text-[color:var(--text-muted)]">
                  <p>
                    <span className="font-semibold text-[color:var(--text-primary)]">{t("service")}:</span> {item.service}
                  </p>
                  {item.boundaryId && boundaryMap.has(item.boundaryId) ? (
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {t("boundary")}:{" "}
                      <span className="font-semibold text-[color:var(--primary)]">
                        {boundaryMap.get(item.boundaryId)?.label}
                      </span>
                    </p>
                  ) : null}
                  {item.remarks ? <p>{item.remarks}</p> : null}
                  {item.source ? (
                    <p>
                      <a
                        href={item.source}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[color:var(--primary)] underline underline-offset-4"
                      >
                        {t("table.sourceLabel")}
                      </a>
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}