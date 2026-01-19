import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";
import { FeedbackList } from "@/components/admin/feedback-list";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminFeedbackPage({ params }: Props) {
  const { locale } = await params;
  const allowed = await requireStaffPermission("admin:feedback");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">Unauthorized</p>
        </Card>
      </main>
    );
  }

  const submissions = await prisma.feedbackSubmission.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="space-y-4">
      <FeedbackList
        locale={locale}
        entries={submissions.map((entry) => ({
          id: entry.id,
          title: entry.title,
          name: entry.name,
          email: entry.email,
          vid: entry.vid,
          message: entry.message,
          createdAt: entry.createdAt.toLocaleString(locale),
        }))}
      />
    </main>
  );
}
