import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";
import { HeroSlidesAdmin } from "@/components/admin/hero-slides-admin";
import { locales } from "@/i18n";
import { createHeroSlide, updateHeroSlide, deleteHeroSlide } from "./actions";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHeroSlidesPage({ params }: Props) {
  const { locale } = await params;
  const allowed = await requireStaffPermission("admin:hero");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">Unauthorized</p>
        </Card>
      </main>
    );
  }

  const slides = await prisma.heroSlide.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="space-y-4">
      <HeroSlidesAdmin
        slides={slides.map((slide) => ({
          id: slide.id,
          locale: slide.locale,
          eyebrow: slide.eyebrow,
          title: slide.title,
          subtitle: slide.subtitle,
          imageUrl: slide.imageUrl,
          imageAlt: slide.imageAlt,
          ctaLabel: slide.ctaLabel,
          ctaHref: slide.ctaHref,
          secondaryLabel: slide.secondaryLabel,
          secondaryHref: slide.secondaryHref,
          order: slide.order,
          isPublished: slide.isPublished,
          fullWidth: slide.fullWidth,
          updatedAt: slide.updatedAt.toLocaleString(locale),
        }))}
        locales={[...locales]}
        createAction={createHeroSlide}
        updateAction={updateHeroSlide}
        deleteAction={deleteHeroSlide}
      />
    </main>
  );
}
