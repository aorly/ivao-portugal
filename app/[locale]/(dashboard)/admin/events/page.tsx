import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createEvent, deleteEvent, updateEvent } from "@/app/[locale]/(dashboard)/admin/events/actions";
import { prisma } from "@/lib/prisma";
import { MultiAirportInput } from "@/components/admin/multi-airport-input";
import { type Locale } from "@/i18n";

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

  return (
    <main className="grid gap-4 md:grid-cols-2">
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.events")}</p>
        {events.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">{t("cards.eventForm")}</p>
        ) : (
          <ul className="space-y-3 text-sm text-[color:var(--text-muted)]">
            {events.map((event) => (
              <li key={event.id} className="rounded-xl bg-[color:var(--surface-3)] p-3">
                <div className="flex items-center justify-between pb-2">
                  <p className="font-semibold text-[color:var(--text-primary)]">{event.title}</p>
                  <form
                    action={async () => {
                      "use server";
                      await deleteEvent(event.id, locale);
                    }}
                  >
                    <Button size="sm" variant="ghost" type="submit">
                      Delete
                    </Button>
                  </form>
                </div>
                <form
                  action={async (formData) => {
                    "use server";
                    await updateEvent(event.id, formData, locale);
                  }}
                  className="space-y-2"
                >
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      name="title"
                      defaultValue={event.title}
                      className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <input
                      name="slug"
                      defaultValue={event.slug}
                      className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </div>
                  <textarea
                    name="description"
                    defaultValue={event.description}
                    className="w-full min-h-[80px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      name="startTime"
                      defaultValue={new Date(event.startTime).toISOString().slice(0, 16)}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                    <input
                      type="datetime-local"
                      name="endTime"
                      defaultValue={new Date(event.endTime).toISOString().slice(0, 16)}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                    />
                  </div>
                  <MultiAirportInput
                    name="airports"
                    initial={event.airports.map((a) => a.icao)}
                    options={airports.map((a) => a.icao)}
                    label="Airports"
                  />
                  <input
                    name="bannerUrl"
                    placeholder="Banner URL (optional)"
                    defaultValue={event.bannerUrl ?? ""}
                    className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
                  />
                  <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
                    <input type="checkbox" name="isPublished" defaultChecked={event.isPublished} /> Published
                  </label>
                  <div className="flex justify-end">
                    <Button size="sm" type="submit">
                      Save
                    </Button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("cards.eventForm")}</p>
        <form
          action={async (formData) => {
            "use server";
            await createEvent(formData, locale);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              name="title"
              required
              placeholder="Title"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              name="slug"
              placeholder="Slug (optional)"
              className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </div>
          <textarea
            name="description"
            placeholder="Description"
            className="w-full min-h-[80px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              name="startTime"
              required
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
            <input
              type="datetime-local"
              name="endTime"
              required
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            />
          </div>
          <MultiAirportInput name="airports" options={airports.map((a) => a.icao)} label="Airports" />
          <input
            name="bannerUrl"
            placeholder="Banner URL (optional)"
            className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          />
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
            <input type="checkbox" name="isPublished" /> Published
          </label>
          <div className="flex justify-end">
            <Button size="sm" type="submit">
              Save event
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
