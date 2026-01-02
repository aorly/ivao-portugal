import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Tours",
    description: "Division tour series.",
    alternates: { canonical: absoluteUrl(`/${locale}/tours`) },
  };
}

const formatRange = (locale: string, start: Date | null, end: Date | null) => {
  if (!start && !end) return "Dates TBD";
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  if (start && end) return `${fmt.format(start)} - ${fmt.format(end)}`;
  if (start) return `From ${fmt.format(start)}`;
  if (end) return `Until ${fmt.format(end)}`;
  return "Dates TBD";
};

export default async function ToursPage({ params }: Props) {
  const { locale } = await params;

  const tours = await prisma.tour.findMany({
    where: { isPublished: true },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { legs: true, enrollments: true } } },
  });

  const now = new Date();
  const isActive = (tour: (typeof tours)[number]) => {
    if (tour.startDate && tour.startDate > now) return false;
    if (tour.endDate && tour.endDate < now) return false;
    return true;
  };
  const isUpcoming = (tour: (typeof tours)[number]) => tour.startDate && tour.startDate > now;
  const active = tours.filter((t) => isActive(t));
  const upcoming = tours.filter((t) => isUpcoming(t));
  const past = tours.filter((t) => t.endDate && t.endDate < now);

  const renderList = (items: typeof tours) =>
    items.length === 0 ? (
      <p className="text-sm text-white/60">No tours in this section.</p>
    ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {items.map((tour) => (
          <Card key={tour.id} className="space-y-3 p-4 text-white">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{tour.title}</p>
              {tour.code ? <p className="text-xs text-white/60">{tour.code}</p> : null}
            </div>
            <p className="text-sm text-white/80 line-clamp-3">{tour.description ?? "Tour details coming soon."}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
              <span>{formatRange(locale, tour.startDate, tour.endDate)}</span>
              <span>{tour._count.legs} legs - {tour._count.enrollments} joined</span>
            </div>
            <Link className="text-sm font-semibold text-white underline" href={`/${locale}/tours/${tour.slug}`}>
              View tour
            </Link>
          </Card>
        ))}
      </div>
    );

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 text-white">
        <h1 className="text-2xl font-semibold">Tours</h1>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Current tours</h2>
          {renderList(active)}
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Upcoming tours</h2>
          {renderList(upcoming)}
        </section>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Past tours</h2>
          {renderList(past)}
        </section>
      </div>
    </main>
  );
}
