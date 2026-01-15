import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { locales } from "@/i18n";
import { loadCmsPages } from "@/lib/cms-pages";
import { getCategoryPath, loadCmsCategories } from "@/lib/cms-categories";
import { absoluteUrl } from "@/lib/seo";

type SitemapEntry = MetadataRoute.Sitemap[number];

const fetchSitemapData = unstable_cache(
  async () => {
    const [events, airports, firs, cmsPages, cmsCategories] = await Promise.all([
      prisma.event.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
      prisma.airport.findMany({ select: { icao: true, updatedAt: true } }),
      prisma.fir.findMany({ select: { slug: true, ivaoSyncedAt: true } }),
      loadCmsPages(),
      loadCmsCategories(),
    ]);

    const publishedPages = cmsPages.filter((page) => page.published);

    return { events, airports, firs, pages: publishedPages, categories: cmsCategories };
  },
  ["public-sitemap"],
  { revalidate: 600 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { events, airports, firs, pages, categories } = await fetchSitemapData();
  const entries: SitemapEntry[] = [];

  for (const locale of locales) {
    const baseRoutes = [
      `/${locale}/home`,
      `/${locale}/events`,
      `/${locale}/airports`,
      `/${locale}/airports/timetable`,
      `/${locale}/airspace`,
      `/${locale}/significant-points`,
    ];

    baseRoutes.forEach((route) => {
      entries.push({ url: absoluteUrl(route) });
    });

    events.forEach((event) => {
      entries.push({
        url: absoluteUrl(`/${locale}/events/${event.slug}`),
        lastModified: event.updatedAt,
      });
    });

    airports.forEach((airport) => {
      entries.push({
        url: absoluteUrl(`/${locale}/airports/${airport.icao.toLowerCase()}`),
        lastModified: airport.updatedAt,
      });
    });

    firs.forEach((fir) => {
      entries.push({
        url: absoluteUrl(`/${locale}/fir/${fir.slug}`),
        lastModified: fir.ivaoSyncedAt ?? undefined,
      });
    });

    pages
      .filter((page) => page.locale === locale)
      .forEach((page) => {
        if (!page.categoryId) return;
        const categoryPath = getCategoryPath(categories, page.categoryId).join("/");
        if (!categoryPath) return;
        entries.push({
          url: absoluteUrl(`/${locale}/${categoryPath}/${page.slug}`),
          lastModified: new Date(page.updatedAt),
        });
      });

    categories.forEach((category) => {
      const categoryPath = getCategoryPath(categories, category.id).join("/");
      if (!categoryPath) return;
      entries.push({ url: absoluteUrl(`/${locale}/${categoryPath}`) });
    });
  }

  return entries;
}
