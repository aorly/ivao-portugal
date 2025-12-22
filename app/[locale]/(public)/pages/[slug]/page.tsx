import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { findPublishedPage, parsePuckContent, renderContentToHtml } from "@/lib/cms-pages";
import { type Locale } from "@/i18n";
import { unstable_cache } from "next/cache";
import { absoluteUrl } from "@/lib/seo";
import { Badge } from "@/components/ui/badge";
import { PuckRenderer } from "@/components/puck/puck-renderer";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

const getCmsPage = unstable_cache(
  (pageLocale: Locale, pageSlug: string) => findPublishedPage(pageLocale, pageSlug),
  ["public-cms-page"],
  { revalidate: 600 },
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await getCmsPage(locale, slug);
  if (!page) {
    return {
      title: "Content not found",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: page.title,
    description: page.summary ?? "",
    alternates: { canonical: absoluteUrl(`/${locale}/pages/${page.slug}`) },
  };
}

export default async function CmsPage({ params }: Props) {
  const { locale, slug } = await params;
  const page = await getCmsPage(locale, slug);

  if (!page) return notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    datePublished: page.createdAt,
    dateModified: page.updatedAt,
    author: { "@type": "Organization", name: "IVAO Portugal" },
    mainEntityOfPage: absoluteUrl(`/${locale}/pages/${page.slug}`),
  };

  return (
    <main className="space-y-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SectionHeader eyebrow="Content" title={page.title} description={page.summary ?? ""} />
      <Card className="space-y-3 bg-[color:var(--surface-2)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--text-muted)]">
          <Badge>Published</Badge>
          <span>Last updated {new Date(page.updatedAt).toLocaleString()}</span>
        </div>
        {(() => {
          const puckData = parsePuckContent(page.content);
          if (puckData) {
            return <PuckRenderer data={puckData} />;
          }
          return (
            <div
              className="text-sm leading-relaxed text-[color:var(--text-primary)]"
              dangerouslySetInnerHTML={{ __html: renderContentToHtml(page.content) }}
            />
          );
        })()}
        <p className="text-xs text-[color:var(--text-muted)]">/{locale}/pages/{page.slug}</p>
      </Card>
    </main>
  );
}
