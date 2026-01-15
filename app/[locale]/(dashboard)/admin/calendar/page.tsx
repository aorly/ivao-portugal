import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";
import { getTranslations } from "next-intl/server";
import { type Locale } from "@/i18n";
import { syncCalendarNow } from "./actions";

type Props = { params: Promise<{ locale: Locale }> };

const formatDateTime = (locale: Locale, date: Date | null) => {
  if (!date) return "Never";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
};

export default async function AdminCalendarPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const allowed = await requireStaffPermission("admin:events");
  if (!allowed) {
    return (
      <main className="space-y-4">
        <Card className="p-4">
          <p className="text-sm text-[color:var(--danger)]">{t("unauthorized")}</p>
        </Card>
      </main>
    );
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  const [sync, events] = await Promise.all([
    prisma.calendarSync.findUnique({ where: { source: "google-calendar" } }),
    prisma.calendarEvent.findMany({
      orderBy: { startTime: "asc" },
      take: 60,
      where: { startTime: { gte: cutoffDate } },
    }),
  ]);

  const visibleEvents = events.filter((event) => event.type === "EXAM" || event.type === "TRAINING");
  const upcoming = visibleEvents.filter((event) => event.startTime >= new Date());
  const exams = upcoming.filter((event) => event.type === "EXAM");
  const trainings = upcoming.filter((event) => event.type === "TRAINING");

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Calendar sync</p>
          <p className="text-xs text-[color:var(--text-muted)]">Events are sourced from the IVAO Google Calendar ICS feed.</p>
        </div>
        <form
          action={async () => {
            "use server";
            await syncCalendarNow(locale);
          }}
        >
          <Button size="sm" variant="secondary" type="submit">
            Sync now
          </Button>
        </form>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Last sync</p>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatDateTime(locale, sync?.lastSyncedAt ?? null)}</p>
          <p className="text-xs text-[color:var(--text-muted)]">{sync?.lastStatus ?? "unknown"}</p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Upcoming training</p>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{trainings.length}</p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Upcoming exams</p>
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{exams.length}</p>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">Calendar events</p>
        {visibleEvents.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">No calendar events available.</p>
        ) : (
          <div className="space-y-2">
            {visibleEvents.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{event.title}</p>
                  <p className="text-xs text-[color:var(--text-muted)]">
                    {formatDateTime(locale, event.startTime)} {event.endTime ? `- ${formatDateTime(locale, event.endTime)}` : ""}
                  </p>
                  {event.location ? <p className="text-xs text-[color:var(--text-muted)]">{event.location}</p> : null}
                </div>
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-primary)]">
                  {event.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  );
}
