import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { RegistrationButton } from "@/components/events/registration-button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      airports: { select: { icao: true } },
      firs: { select: { slug: true } },
      registrations: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const isRegistered = Boolean(
    session?.user?.id && event.registrations.some((r) => r.userId === session.user?.id),
  );

  const start = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.startTime);
  const end = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(event.endTime);

  const timeframe = `${t("starts")}: ${start} | ${t("ends")}: ${end}`;

  return (
    <main className="flex flex-col gap-6">
      <SectionHeader
        eyebrow={t("title")}
        title={event.title}
        description={timeframe}
        action={
          session?.user ? (
            <RegistrationButton
              eventId={event.id}
              eventSlug={event.slug}
              locale={locale}
              isRegistered={isRegistered}
              labels={{ register: t("register"), unregister: t("unregister") }}
            />
          ) : null
        }
      />

      <Card className="space-y-3">
        <p className="text-sm text-[color:var(--text-muted)]">{event.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)]">
          {event.airports.map((a) => (
            <span key={a.icao} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">
              {a.icao}
            </span>
          ))}
          {event.firs.map((f) => (
            <span key={f.slug} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1">
              {f.slug}
            </span>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("friends")}</p>
          <p className="text-xs text-[color:var(--text-muted)]">
            {t("goingCount", { count: event.registrations.length })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.registrations.map((reg) => (
            <span
              key={reg.id}
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm text-[color:var(--text-primary)]"
            >
              {reg.user.name ?? reg.user.id}
            </span>
          ))}
          {event.registrations.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("sampleDescription")}</p>
          ) : null}
        </div>
      </Card>
    </main>
  );
}


