import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  assignTrainingRequest,
  createTrainingSession,
  deleteTrainingRequest,
  updateTrainingRequestStatus,
} from "@/app/[locale]/(dashboard)/admin/training/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  scheduled: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_CLASS[value] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {value}
    </span>
  );
}

export default async function AdminTrainingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const [requests, sessions] = await Promise.all([
    prisma.trainingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { id: true, name: true, vid: true } }, assignedTrainer: { select: { vid: true } } },
    }),
    prisma.trainingSession.findMany({
      orderBy: { dateTime: "desc" },
      take: 12,
      include: {
        user: { select: { id: true, name: true, vid: true } },
      },
    }),
  ]);

  const userOptions = Array.from(
    new Map(
      [...requests, ...sessions].map((item) => {
        const user = item.user;
        return [
          user?.id ?? "",
          {
            id: user?.id ?? "",
            label: `${user?.name ?? user?.vid ?? user?.id ?? ""}`,
          },
        ];
      }),
    ).entries(),
  )
    .map(([, val]) => val)
    .filter((opt) => opt.id);

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">Training</p>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Requests & Sessions</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            Assign trainers, move requests forward, and keep sessions organised.
          </p>
        </div>
        <Link href={`/${locale}/admin/exams`}>
          <Button size="sm" variant="secondary">
            Exams
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.training")}</p>
            <span className="text-xs text-[color:var(--text-muted)]">{requests.length} open</span>
          </div>
          {requests.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("cards.trainingForm")}</p>
          ) : (
            <ul className="space-y-4 text-sm text-[color:var(--text-muted)]">
              {requests.map((req) => (
                <li key={req.id} className="space-y-3 rounded-xl border border-[color:var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge value={req.status} />
                      <span className="text-xs text-[color:var(--text-muted)]">
                        {new Date(req.createdAt).toUTCString()}
                      </span>
                    </div>
                    <Link href={`/${locale}/admin/training/requests/${req.id}`}>
                      <Button size="sm" variant="secondary">
                        Manage
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    <p className="text-base font-semibold text-[color:var(--text-primary)]">
                      {req.user.name ?? req.user.vid} · {req.type}
                    </p>
                    {req.message ? <p className="text-xs leading-relaxed">{req.message}</p> : null}
                    {(() => {
                      try {
                        const av = JSON.parse(req.availabilities ?? "[]");
                        if (Array.isArray(av) && av.length) {
                          return <p className="text-xs">Availability: {av.join(", ")}</p>;
                        }
                      } catch {}
                      return null;
                    })()}
                    <p className="text-xs text-[color:var(--text-muted)]">
                      Assigned trainer: {req.assignedTrainer?.vid ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[color:var(--surface-2)] px-3 py-2">
                    <form
                      action={async (formData) => {
                        "use server";
                        const status = String(formData.get("status") ?? req.status);
                        await updateTrainingRequestStatus(req.id, status, locale);
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="status"
                        defaultValue={req.status}
                        className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                      >
                        <option value="pending">pending</option>
                        <option value="scheduled">scheduled</option>
                        <option value="completed">completed</option>
                        <option value="rejected">rejected</option>
                      </select>
                      <Button size="sm" variant="secondary" type="submit">
                        Save
                      </Button>
                    </form>
                    <form
                      action={async (formData) => {
                        "use server";
                        const trainerVid = String(formData.get("trainerVid") ?? "");
                        await assignTrainingRequest(req.id, trainerVid, locale);
                      }}
                      className="flex items-center gap-2"
                    >
                      <input
                        name="trainerVid"
                        placeholder="Trainer VID"
                        className="w-32 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-xs text-[color:var(--text-primary)]"
                        required
                      />
                      <Button size="sm" variant="secondary" type="submit">
                        Assign
                      </Button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await deleteTrainingRequest(req.id, locale);
                      }}
                    >
                      <Button size="sm" variant="ghost" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.trainingForm")}</p>
            <span className="text-xs text-[color:var(--text-muted)]">{sessions.length} sessions</span>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("cards.training")}</p>
          ) : (
            <ul className="space-y-2 text-sm text-[color:var(--text-muted)]">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-xl border border-[color:var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{session.type}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {session.user.name ?? session.user.vid} / {new Date(session.dateTime).toUTCString()}
                      </p>
                      {session.notes ? <p className="text-xs">{session.notes}</p> : null}
                    </div>
                    <Link href={`/${locale}/admin/training/${session.id}`}>
                      <Button size="sm" variant="secondary">
                        View / Comment
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3 pt-4">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Create session</p>
            <form
              action={async (formData) => {
                "use server";
                await createTrainingSession(formData, locale);
              }}
              className="space-y-2 pt-2"
            >
              <select
                name="userId"
                required
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              >
                <option value="">Select user</option>
                {userOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                name="type"
                required
                placeholder="Session type"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                type="datetime-local"
                name="dateTime"
                required
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <input
                name="instructorId"
                placeholder="Instructor user ID (optional)"
                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <textarea
                name="notes"
                placeholder="Notes"
                className="w-full min-h-[80px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
              />
              <div className="flex justify-end">
                <Button size="sm" type="submit">
                  Save session
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
}


