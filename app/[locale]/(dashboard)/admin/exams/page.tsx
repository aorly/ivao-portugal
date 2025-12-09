import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createExam, deleteExam } from "@/app/[locale]/(dashboard)/admin/exams/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminExamsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const exams = await prisma.trainingExam.findMany({ orderBy: { dateTime: "desc" }, take: 20 });

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Exams</p>
        {exams.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No exams announced</p>
        ) : (
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {exams.map((exam) => (
              <li key={exam.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[color:var(--text-primary)]">{exam.title}</p>
                    <p className="text-xs">
                      {new Date(exam.dateTime).toUTCString()} {exam.link ? `· ${exam.link}` : ""}
                    </p>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteExam(exam.id, locale);
                    }}
                  >
                    <Button size="sm" variant="ghost" type="submit">
                      Delete
                    </Button>
                  </form>
                </div>
                {exam.description ? <p className="text-xs">{exam.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Add Exam</p>
        <form
          action={async (formData) => {
            "use server";
            await createExam(formData, locale);
          }}
          className="space-y-3"
        >
          <input
            name="title"
            required
            placeholder="Title"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <textarea
            name="description"
            placeholder="Description"
            className="w-full min-h-[80px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            type="datetime-local"
            name="dateTime"
            required
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <input
            name="link"
            placeholder="External link"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
