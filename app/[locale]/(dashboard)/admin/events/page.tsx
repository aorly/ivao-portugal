import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { EventsAdmin } from "@/components/admin/events-admin";
import { createEvent, updateEvent, deleteEvent } from "@/app/[locale]/(dashboard)/admin/events/actions";

type Props = {
  params: Promise<{ locale: Locale }>;
};

export default async function AdminEventsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  const events = await prisma.event.findMany({
    orderBy: { startTime: "desc" },
    include: {
      airports: { select: { icao: true } },
    },
    take: 10,
  });
  const airports = await prisma.airport.findMany({ select: { icao: true }, orderBy: { icao: "asc" } });

  const now = new Date();
  const upcoming = events.filter((e) => e.startTime >= now);
  const past = events.filter((e) => e.startTime < now);

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
      />
    </main>
  );
}
