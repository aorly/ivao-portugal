import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { EventsAdmin } from "@/components/admin/events-admin";
import { createEvent, updateEvent, deleteEvent, importIvaoEvent } from "@/app/[locale]/(dashboard)/admin/events/actions";
import { Card } from "@/components/ui/card";
import { requireStaffPermission } from "@/lib/staff";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminEventsPage({ params }: Props) {
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
  const events = await prisma.event.findMany({
    orderBy: { startTime: "desc" },
    include: {
      airports: { select: { icao: true } },
    },
    take: 10,
  });
  const airports = await prisma.airport.findMany({ select: { icao: true }, orderBy: { icao: "asc" } });

  const toDto = (event: (typeof events)[number]) => ({
    ...event,
    description: event.description ?? null,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
  });
  const now = new Date();
  const upcoming = events.filter((e) => e.startTime >= now).map(toDto);
  const past = events.filter((e) => e.startTime < now).map(toDto);

  return (
    <main className="space-y-4">
      <EventsAdmin
        upcoming={upcoming}
        past={past}
        airports={airports}
        locale={locale}
        createAction={createEvent}
        updateAction={updateEvent}
        deleteAction={deleteEvent}
        importAction={importIvaoEvent}
      />
    </main>
  );
}
