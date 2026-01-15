import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { findPublishedPageByCategory, loadCmsPages, parsePuckContent, renderContentToHtml } from "@/lib/cms-pages";
import { findCategoryByPath, getCategoryPath, loadCmsCategories } from "@/lib/cms-categories";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";
import { PuckRenderer } from "@/components/puck/puck-renderer";
import { type Data } from "@measured/puck";
import { DocsPhaseNav } from "@/components/public/docs-phase-nav";
import { DocsTools } from "@/components/public/docs-tools";
import { PracticeModeProvider } from "@/components/public/practice-mode";
import { DocsLibrary } from "@/components/public/docs-library";

type Props = { params: Promise<{ locale: Locale; category: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  const segments = Array.isArray(category) ? category : [category];
  const categories = await loadCmsCategories();
  const exactCategory = findCategoryByPath(categories, segments);
  if (exactCategory) {
    return {
      title: exactCategory.name,
      description: exactCategory.description ?? "",
      alternates: {
        canonical: absoluteUrl(`/${locale}/${getCategoryPath(categories, exactCategory.id).join("/")}`),
      },
    };
  }

  if (segments.length > 1) {
    const slug = segments[segments.length - 1];
    const categorySegments = segments.slice(0, -1);
    const currentCategory = findCategoryByPath(categories, categorySegments);
    if (currentCategory) {
      const page = await findPublishedPageByCategory(locale, currentCategory.id, slug);
      if (page) {
        return {
          title: page.title,
          description: page.summary ?? "",
          alternates: {
            canonical: absoluteUrl(
              `/${locale}/${getCategoryPath(categories, currentCategory.id).join("/")}/${page.slug}`,
            ),
          },
        };
      }
    }
  }

  return {
    title: "Content not found",
    robots: { index: false, follow: false },
  };
}

export default async function CategoryIndex({ params }: Props) {
  const { locale, category } = await params;
  const segments = Array.isArray(category) ? category : [category];
  const categories = await loadCmsCategories();
  const exactCategory = findCategoryByPath(categories, segments);
  if (!exactCategory && segments.length > 1) {
    const slug = segments[segments.length - 1];
    const categorySegments = segments.slice(0, -1);
    const currentCategory = findCategoryByPath(categories, categorySegments);
    if (!currentCategory) return notFound();
    const page = await findPublishedPageByCategory(locale, currentCategory.id, slug);
    if (!page) return notFound();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      datePublished: page.createdAt,
      dateModified: page.updatedAt,
      author: { "@type": "Organization", name: "IVAO Portugal" },
      mainEntityOfPage: absoluteUrl(
        `/${locale}/${getCategoryPath(categories, currentCategory.id).join("/")}/${page.slug}`,
      ),
    };

    const puckData = parsePuckContent(page.content);
    type PuckItem = { type?: string; props?: Record<string, unknown> };
    const isPhaseCard = (item: unknown): item is PuckItem =>
      Boolean(item && typeof item === "object" && (item as { type?: unknown }).type === "PhaseCard");
    const isPhaseCardWithTitle = (item: unknown): item is PuckItem =>
      isPhaseCard(item) && typeof item.props?.title === "string";

    const phaseItems =
      puckData?.content
        ?.filter(isPhaseCardWithTitle)
        .map((item) => ({
          id: (item.props?.anchorId as string) || "",
          title: (item.props?.title as string) || "",
        }))
        .filter((item) => item.id && item.title) ?? [];
    const renderData = puckData ? ({ ...puckData, root: puckData.root ?? {} } as Data) : null;
    const storageKey = `docs:last-phase:${page.slug}`;

    const extractText = (node: Record<string, unknown> | null): string => {
      if (!node || typeof node !== "object") return "";
      const props = (node as { props?: Record<string, unknown> }).props ?? {};
      const values = [
        props.title,
        props.subtitle,
        props.body,
        props.summary,
        props.question,
        props.explanation,
        props.code,
      ]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
      const arrays = ["items", "bullets", "options", "body"].flatMap((key) => {
        const entry = props[key];
        if (!Array.isArray(entry)) return [];
        return entry.map((item) =>
          typeof item === "string" ? item : typeof item?.text === "string" ? item.text : "",
        );
      });
      return `${values} ${arrays.join(" ")}`.trim();
    };

    const searchIndex =
      puckData?.content
        ?.filter(isPhaseCard)
        .map((item) => ({
          id: (item.props?.anchorId as string) || "",
          title: (item.props?.title as string) || "",
          text: Array.isArray(item.props?.body)
            ? item.props.body.map((child) => extractText(child)).join(" ")
            : "",
        }))
        .filter((item) => item.id && item.title) ?? [];

    const takeaways =
      puckData?.content
        ?.filter(isPhaseCard)
        .flatMap((item) => {
          const body = Array.isArray(item.props?.body) ? item.props.body : [];
          return body
            .filter((child) => child?.type === "KeyTakeaway" && typeof child?.props?.body === "string")
            .map((child) => ({
              title: (item.props?.title as string) || "Phase",
              body: (child?.props?.body as string) || "",
            }));
        }) ?? [];

    const recapItems = takeaways.flatMap((entry) =>
      entry.body
        .split("\n")
        .map((line) => line.replace(/^-\\s*/, "").trim())
        .filter(Boolean)
        .map((line) => ({ label: entry.title, text: line })),
    );

    return (
      <main className="space-y-10">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          {renderData ? (
            <PracticeModeProvider>
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="space-y-10">
                  <DocsTools items={phaseItems} searchIndex={searchIndex} storageKey={storageKey} />
                  <div className="docs-phase-stack space-y-16">
                    <PuckRenderer data={renderData} />
                    {recapItems.length > 0 ? (
                      <section className="rounded-3xl bg-[color:var(--surface-2)]/70 px-6 py-6">
                        <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">
                          Recap summary
                        </h2>
                        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                          All key takeaways in one place.
                        </p>
                        <div className="mt-4 space-y-3">
                          {recapItems.map((item, index) => (
                            <div
                              key={`${item.label}-${index}`}
                              className="rounded-xl bg-[color:var(--surface)] px-4 py-3"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                                {item.label}
                              </p>
                              <p className="mt-1 text-sm text-[color:var(--text-primary)]">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                </div>
                <DocsPhaseNav items={phaseItems} />
              </div>
            </PracticeModeProvider>
          ) : (
            <Card className="space-y-3 bg-[color:var(--surface-2)] p-5">
              <div
                className="text-sm leading-relaxed text-[color:var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: renderContentToHtml(page.content) }}
              />
            </Card>
          )}
        </div>
      </main>
    );
  }

  const currentCategory = exactCategory;
  if (!currentCategory) return notFound();

  const pages = (await loadCmsPages())
    .filter((page) => page.published && page.locale === locale && page.categoryId === currentCategory.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const currentPath = getCategoryPath(categories, currentCategory.id);
  const subcategories = categories
    .filter((entry) => entry.parentId === currentCategory.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (pages.length === 1 && subcategories.length === 0) {
    redirect(`/${locale}/${getCategoryPath(categories, currentCategory.id).join("/")}/${pages[0].slug}`);
  }

  const subcategoryItems = categories
    .map((subcategory) => ({
      category: subcategory,
      path: getCategoryPath(categories, subcategory.id),
    }))
    .filter(({ category, path }) => category.id !== currentCategory.id && path.slice(0, currentPath.length).join("/") === currentPath.join("/"))
    .map(({ category, path }) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      href: `/${locale}/${path.join("/")}`,
      depth: Math.max(0, path.length - currentPath.length),
    }))
    .sort((a, b) => a.href.localeCompare(b.href));

  const pageItems = pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    summary: page.summary ?? "",
    href: `/${locale}/${getCategoryPath(categories, currentCategory.id).join("/")}/${page.slug}`,
    tags: page.tags ?? [],
    section: page.section ?? null,
    order: page.order ?? null,
    featured: page.featured ?? false,
    updatedAt: page.updatedAt,
  }));

  return (
    <main className="space-y-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-[color:var(--text-primary)]">{currentCategory.name}</h1>
          {currentCategory.description ? (
            <p className="text-sm text-[color:var(--text-muted)]">{currentCategory.description}</p>
          ) : null}
        </div>
        <DocsLibrary categories={subcategoryItems} pages={pageItems} locale={locale} />
      </div>
    </main>
  );
}
