import Link from "next/link";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { loadCmsPages } from "@/lib/cms-pages";
import { type Locale } from "@/i18n";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ locale: Locale }> };

export default async function PagesIndex({ params }: Props) {
  const { locale } = await params;
  const pages = (await loadCmsPages())
    .filter((p) => p.published && p.locale === locale)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="space-y-6">
      <SectionHeader
        eyebrow="Content"
        title="Pages"
        description="Curated static pages maintained by staff. Content is locale-specific."
      />
      {pages.length === 0 ? (
        <Card className="p-4 text-sm text-[color:var(--text-muted)]">
          No pages published yet. Ask staff to publish a page for this locale.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link key={page.slug} href={`/${locale}/pages/${page.slug}`}>
              <Card className="h-full space-y-2 p-4 transition hover:-translate-y-[2px] hover:border-[color:var(--primary)]">
                <div className="flex items-center justify-between">
                  <Badge>Published</Badge>
                  <span className="text-[11px] text-[color:var(--text-muted)]">
                    Updated {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{page.title}</p>
                {page.summary ? (
                  <p className="text-sm text-[color:var(--text-muted)] line-clamp-3">{page.summary}</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
