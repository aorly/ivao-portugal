import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { submitTrainingRequest } from "@/app/[locale]/(dashboard)/training/actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function TrainingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "training" });
  const session = await auth();

  const user = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          trainingRequests: { orderBy: { createdAt: "desc" }, take: 5 },
          trainingSessions: { orderBy: { dateTime: "desc" }, take: 5 },
        },
      })
    : null;
  const exams = await prisma.trainingExam.findMany({ orderBy: { dateTime: "desc" }, take: 5 });

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <Card className="space-y-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("requestTitle")}</p>
        {session?.user ? (
          <form
            action={async (formData) => {
              "use server";
              await submitTrainingRequest(formData, params.locale);
            }}
            className="space-y-3"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[color:var(--text-muted)]" htmlFor="type">
                {t("requestType")}
              </label>
              <select
                id="type"
                name="type"
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                required
              >
                <option value="PILOT">Pilot</option>
                <option value="ATC">ATC</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[color:var(--text-muted)]" htmlFor="message">
                {t("requestMessage")}
              </label>
              <textarea
                id="message"
                name="message"
                className="min-h-[100px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                placeholder="What do you need help with?"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm text-[color:var(--text-muted)]" htmlFor="availability">
                Availability (dates/periods, one per line)
              </label>
              <textarea
                id="availability"
                name="availability"
                className="min-h-[80px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                placeholder="e.g. 2025-01-15 evenings&#10;2025-01-18 10:00-14:00Z"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--primary-strong)]"
            >
              {t("requestSubmit")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-[color:var(--text-muted)]">{t("body")}</p>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("requests")}</p>
          {user?.trainingRequests?.length ? (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {user.trainingRequests.map((req) => (
                <li key={req.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                  <p className="font-semibold text-[color:var(--text-primary)]">{req.type}</p>
                  <p className="text-xs">{req.message ?? "-"}</p>
                  <p className="text-xs uppercase tracking-[0.1em] text-[color:var(--text-muted)]">
                    {req.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
          )}
        </Card>

        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("sessions")}</p>
          {user?.trainingSessions?.length ? (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {user.trainingSessions.map((sessionItem) => (
                <li key={sessionItem.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                  <p className="font-semibold text-[color:var(--text-primary)]">{sessionItem.type}</p>
                  <p className="text-xs">{new Date(sessionItem.dateTime).toUTCString()}</p>
                  {sessionItem.notes ? <p className="text-xs">{sessionItem.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">{t("none")}</p>
          )}
        </Card>
      </div>
      <Card className="space-y-2">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Upcoming Exams</p>
        {exams.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No exams announced</p>
        ) : (
          <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
            {exams.map((exam) => (
              <li key={exam.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                <p className="font-semibold text-[color:var(--text-primary)]">{exam.title}</p>
                <p className="text-xs">{new Date(exam.dateTime).toUTCString()}</p>
                {exam.description ? <p className="text-xs">{exam.description}</p> : null}
                {exam.link ? (
                  <a href={exam.link} className="text-xs font-semibold text-[color:var(--primary)] underline">
                    Exam details
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
