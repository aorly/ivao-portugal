import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "firs" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: absoluteUrl(`/${locale}/fir`) },
  };
}

export default async function FirsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "firs" });

  const firs = await prisma.fir.findMany({
    orderBy: { slug: "asc" },
    select: { id: true, slug: true, name: true, description: true },
  });

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-[color:var(--text-primary)]">
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{t("eyebrow")}</p>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="max-w-2xl text-sm text-[color:var(--text-muted)]">{t("description")}</p>
        </section>

        {firs.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-[color:var(--text-muted)]">{t("empty")}</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {firs.map((fir) => (
              <Link key={fir.id} href={`/${locale}/fir/${fir.slug}`}>
                <Card className="h-full space-y-2 border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[var(--shadow-soft)] transition hover:border-[color:var(--primary)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{fir.slug}</p>
                  <p className="text-lg font-semibold text-[color:var(--text-primary)]">{fir.name}</p>
                  {fir.description ? (
                    <p className="text-sm text-[color:var(--text-muted)]">{fir.description}</p>
                  ) : null}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
