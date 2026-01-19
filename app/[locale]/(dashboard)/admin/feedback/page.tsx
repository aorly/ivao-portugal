import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";

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
      <div>
        <h1 className="text-lg font-semibold text-[color:var(--text-primary)]">Feedback</h1>
        <p className="text-xs text-[color:var(--text-muted)]">{submissions.length} submissions</p>
      </div>
      <div className="space-y-3">
        {submissions.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-[color:var(--text-muted)]">No feedback submitted yet.</p>
          </Card>
        ) : (
          submissions.map((entry) => (
            <Card key={entry.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {entry.title || "Feedback"}
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {entry.name} {entry.vid ? `• ${entry.vid}` : ""} {entry.email ? `• ${entry.email}` : ""}
                  </p>
                </div>
                <p className="text-xs text-[color:var(--text-muted)]">
                  {entry.createdAt.toLocaleString(locale)}
                </p>
              </div>
              <p className="text-sm text-[color:var(--text-primary)] whitespace-pre-wrap">{entry.message}</p>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
