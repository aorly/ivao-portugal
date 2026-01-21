import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";
import { TestimonialsList } from "@/components/admin/testimonials-list";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminTestimonialsPage({ params }: Props) {
  const { locale } = await params;
  const allowed = await requireStaffPermission("admin:testimonials");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">Unauthorized</p>
        </Card>
      </main>
    );
  }

  const testimonials = await prisma.testimonial.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <main className="space-y-4">
      <TestimonialsList
        entries={testimonials.map((entry) => ({
          id: entry.id,
          name: entry.name,
          role: entry.role,
          content: entry.content,
          status: entry.status,
          createdAt: entry.createdAt.toLocaleString(locale),
        }))}
      />
    </main>
  );
}
