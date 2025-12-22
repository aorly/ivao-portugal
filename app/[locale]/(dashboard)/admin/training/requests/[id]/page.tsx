import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { assignTrainingRequest, createTrainingSession, deleteTrainingRequest, updateTrainingRequestStatus } from "@/app/[locale]/(dashboard)/admin/training/actions";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { requireStaffPermission } from "@/lib/staff";

const STATUS_STEPS = ["pending", "scheduled", "completed", "rejected"] as const;
const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  scheduled: "bg-sky-100 text-sky-800",
  completed: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

function StatusBadge({ value }: { value: string }) {
  const cls = STATUS_CLASS[value] ?? "bg-gray-100 text-gray-800";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{value}</span>;
}

function Stepper({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
      {STATUS_STEPS.map((step, idx) => {
        const active = STATUS_STEPS.indexOf(current as (typeof STATUS_STEPS)[number]) >= idx;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`h-2.5 w-2.5 rounded-full ${active ? "bg-[color:var(--primary)]" : "bg-[color:var(--border)]"}`} />
            <span className={active ? "text-[color:var(--text-primary)]" : ""}>{step}</span>
            {idx < STATUS_STEPS.length - 1 ? <span className="text-[color:var(--border)]">-</span> : null}
          </div>
        );
      })}
    </div>
  );
}

type Props = {
  params: Promise<{ locale: Locale; id: string }>;
};

export default async function AdminTrainingRequestDetail({ params }: Props) {
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

  const request = await prisma.trainingRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, vid: true, name: true, email: true } },
      assignedTrainer: { select: { vid: true, name: true } },
    },
  });

  if (!request) {
    notFound();
  }

  const availabilityList = (() => {
    try {
      const parsed = JSON.parse(request.availabilities ?? "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("cards.training")}</p>
          <div className="flex items-center gap-2">
            <StatusBadge value={request.status} />
            <span className="text-xs text-[color:var(--text-muted)]">{new Date(request.createdAt).toUTCString()}</span>
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
            {request.user.name ?? request.user.vid} / {request.type}
          </h1>
          <p className="text-sm text-[color:var(--text-muted)]">Request ID: {request.id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Stepper current={request.status} />
          <Link href={`/${locale}/admin/training`}>
            <Button variant="ghost" size="sm">
              {t("back")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Request details</p>
            <StatusBadge value={request.status} />
          </div>
          <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
            <p>
              <span className="font-semibold text-[color:var(--text-primary)]">Member:</span> {request.user.name ?? request.user.vid}
            </p>
            {request.user.email ? <p>Email: {request.user.email}</p> : null}
            <p>
              <span className="font-semibold text-[color:var(--text-primary)]">Assigned trainer:</span>{" "}
              {request.assignedTrainer?.vid ?? "Unassigned"}
            </p>
            {request.message ? <p className="leading-relaxed">{request.message}</p> : null}
            {availabilityList.length ? (
              <div>
                <p className="font-semibold text-[color:var(--text-primary)]">Availability</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {availabilityList.map((slot) => (
                    <li key={slot}>{slot}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Manage</p>
          <form
            action={async (formData) => {
              "use server";
              const status = String(formData.get("status") ?? request.status);
              await updateTrainingRequestStatus(request.id, status, locale);
            }}
            className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
          >
            <label className="text-xs text-[color:var(--text-muted)]">Update status</label>
            <select
              name="status"
              defaultValue={request.status}
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm text-[color:var(--text-primary)]"
            >
              {STATUS_STEPS.map((step) => (
                <option key={step} value={step}>
                  {step}
                </option>
              ))}
            </select>
            <Button size="sm" variant="secondary" type="submit" className="w-full">
              Save status
            </Button>
          </form>

          <form
            action={async (formData) => {
              "use server";
              const trainerVid = String(formData.get("trainerVid") ?? "");
              await assignTrainingRequest(request.id, trainerVid, locale);
            }}
            className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
          >
            <label className="text-xs text-[color:var(--text-muted)]">Assign trainer by VID</label>
            <input
              name="trainerVid"
              placeholder="123456"
              className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-sm text-[color:var(--text-primary)]"
              required
            />
            <Button size="sm" variant="secondary" type="submit" className="w-full">
              Assign
            </Button>
          </form>

          <form
            action={async () => {
              "use server";
              await deleteTrainingRequest(request.id, locale);
            }}
            className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-[color:var(--text-muted)]">Danger</p>
              <Button size="sm" variant="ghost" type="submit">
                Delete
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Schedule session</p>
          <p className="text-xs text-[color:var(--text-muted)]">Links to this member automatically</p>
        </div>
        <form
          action={async (formData) => {
            "use server";
            formData.set("userId", request.user.id);
            await createTrainingSession(formData, locale);
          }}
          className="space-y-2"
        >
          <input type="hidden" name="userId" value={request.user.id} />
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
      </Card>
    </main>
  );
}

