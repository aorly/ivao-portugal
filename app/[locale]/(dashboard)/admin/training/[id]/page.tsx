import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addSessionComment } from "@/app/[locale]/(dashboard)/admin/training/[id]/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AdminTrainingSessionDetail({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:training");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const session = await prisma.trainingSession.findUnique({
    where: { id },
    include: {
      user: { select: { vid: true, name: true } },
      instructor: { select: { vid: true, name: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { author: { select: { vid: true, name: true } } } },
    },
  });

  if (!session) {
    notFound();
  }

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Training Session</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{session.type}</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            {session.user.name ?? session.user.vid} · {new Date(session.dateTime).toUTCString()}
          </p>
          {session.instructor ? (
            <p className="text-xs text-[color:var(--text-muted)]">
              Instructor: {session.instructor.name ?? session.instructor.vid}
            </p>
          ) : null}
          {session.notes ? <p className="text-sm text-[color:var(--text-muted)]">{session.notes}</p> : null}
        </div>
        <Link href={`/${locale}/admin/training`}>
          <Button variant="ghost" size="sm">
            Back
          </Button>
        </Link>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Comments</p>
        {session.comments.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No comments yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {session.comments.map((cmt) => (
              <li key={cmt.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                <p className="text-xs text-[color:var(--text-muted)]">
                  {cmt.author?.name ?? cmt.author?.vid ?? "Unknown"} · {new Date(cmt.createdAt).toUTCString()}
                </p>
                <p className="text-sm text-[color:var(--text-primary)]">{cmt.body}</p>
              </li>
            ))}
          </ul>
        )}
        <form
          action={async (formData) => {
            "use server";
            await addSessionComment(formData, session.id, locale);
          }}
          className="space-y-2"
        >
          <textarea
            name="body"
            placeholder="Add comment"
            className="w-full min-h-[80px] rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            required
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Add comment
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
