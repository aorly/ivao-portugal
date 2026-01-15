import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ivaoClient } from "@/lib/ivaoClient";
import { getSiteConfig } from "@/lib/site-config";
import { absoluteUrl } from "@/lib/seo";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data: unknown[] }).data;
  if (value && Array.isArray((value as { items?: unknown[] }).items)) return (value as { items: unknown[] }).items;
  if (value && Array.isArray((value as { result?: unknown[] }).result)) return (value as { result: unknown[] }).result;
  return [];
};

const getName = (entry: Record<string, unknown>) => {
  const direct = (entry.name as string) ?? "";
  if (direct) return direct;
  const fallback = `${(entry.firstName as string) ?? (entry.firstname as string) ?? ""} ${(entry.lastName as string) ?? (entry.lastname as string) ?? ""}`.trim();
  return fallback || "Unknown";
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "GCA holders",
    description: "IVAO GCA holders for the division.",
    alternates: { canonical: absoluteUrl(`/${locale}/gca`) },
  };
}

export default async function DivisionGcaPage() {
  const config = await getSiteConfig();
  const divisionId = (config.divisionId || "PT").toUpperCase();
  const raw = await ivaoClient.getDivisionGcaHolders(divisionId);
  const apiFailed = Array.isArray(raw) && raw.length === 0;
  const holders = asArray(raw).map((entry) => entry as Record<string, unknown>);

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
        <SectionHeader
          eyebrow="Division"
          title="GCA holders"
          description={`Certified GCA holders in IVAO ${divisionId}.`}
          action={null}
        />

        <Card className="border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
          {apiFailed ? (
            <div className="mb-4 rounded-xl border border-[color:rgba(233,52,52,0.3)] bg-[color:rgba(233,52,52,0.12)] px-3 py-2 text-xs font-semibold text-[color:#7a1e1e]">
              IVAO API error while loading GCA holders. Please try again later.
            </div>
          ) : null}
          {holders.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No GCA holders available.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)]">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-[0.7fr_1.6fr_1fr] gap-2 border-b border-[color:var(--border)] px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                  <span>VID</span>
                  <span>Name</span>
                  <span>Rating</span>
                </div>
                <div className="divide-y divide-[color:var(--border)]">
                  {holders.map((entry) => {
                    const vid = String(entry.vid ?? entry.id ?? "-");
                    const rating = String(entry.rating ?? entry.atcRating ?? entry.pilotRating ?? "-");
                    return (
                      <div key={vid} className="grid grid-cols-[0.7fr_1.6fr_1fr] gap-2 px-4 py-3 text-sm">
                        <span className="font-mono text-[color:var(--text-primary)]">{vid}</span>
                        <span className="text-[color:var(--text-primary)]">{getName(entry)}</span>
                        <span className="text-[color:var(--text-muted)]">{rating}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
