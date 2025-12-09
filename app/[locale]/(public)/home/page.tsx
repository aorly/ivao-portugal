import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { type Locale } from "@/i18n";

type Props = {
  params: Promise<{ locale: Locale }>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data: unknown[] }).data;
  if (value && Array.isArray((value as { result?: unknown[] }).result)) return (value as { result: unknown[] }).result;
  if (value && Array.isArray((value as { items?: unknown[] }).items)) return (value as { items: unknown[] }).items;
  return [];
};

const extractIcao = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim().toUpperCase();
    return trimmed || undefined;
  }

  if (typeof value === "object") {
    const candidate =
      (value as { icao?: string }).icao ??
      (value as { id?: string }).id ??
      (value as { code?: string }).code ??
      (value as { airport?: string }).airport ??
      (value as { station?: string }).station;

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toUpperCase();
    }
  }

  return undefined;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const session = await auth();
  const now = new Date();

  const [
    events,
    trainingRequestsWithNotes,
    upcomingSessions,
    upcomingExams,
    airports,
    firs,
    featuredAirports,
    userCount,
  ] = await Promise.all([
    prisma.event.findMany({
      where: { isPublished: true },
      orderBy: { startTime: "asc" },
      include: {
        airports: { select: { icao: true } },
        firs: { select: { slug: true } },
      },
    }),
    prisma.trainingRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      where: { message: { not: null } },
      include: { user: { select: { vid: true, name: true } } },
    }),
    prisma.trainingSession.findMany({
      where: { dateTime: { gte: now } },
      orderBy: { dateTime: "asc" },
      take: 3,
      include: {
        user: { select: { vid: true, name: true } },
        instructor: { select: { vid: true, name: true } },
      },
    }),
    prisma.trainingExam.findMany({
      where: { dateTime: { gte: now } },
      orderBy: { dateTime: "asc" },
      take: 3,
    }),
    prisma.airport.findMany({ select: { icao: true } }),
    prisma.fir.findMany({
      include: {
        airports: { select: { id: true } },
        events: { where: { isPublished: true }, select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.airport.findMany({
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { icao: true, name: true, fir: { select: { slug: true } } },
    }),
    prisma.user.count(),
  ]);

  const airportsCount = airports.length;
  const airportIcaos = new Set(airports.map((airport) => airport.icao.toUpperCase()));

  const [whazzupResult, flightsResult, atcResult] = await Promise.allSettled([
    ivaoClient.getWhazzup(),
    ivaoClient.getFlights(),
    ivaoClient.getOnlineAtc(),
  ]);

  const whazzup = whazzupResult.status === "fulfilled" ? whazzupResult.value : null;
  const whazzupPilots = asArray((whazzup as { clients?: { pilots?: unknown } })?.clients?.pilots);
  const whazzupAtc = asArray(
    (whazzup as { clients?: { atc?: unknown; atcs?: unknown; controllers?: unknown } })?.clients?.atc ??
      (whazzup as { clients?: { atcs?: unknown; controllers?: unknown } })?.clients?.atcs ??
      (whazzup as { clients?: { controllers?: unknown } })?.clients?.controllers,
  );

  const flights =
    whazzupPilots.length > 0
      ? whazzupPilots
      : asArray(flightsResult.status === "fulfilled" ? flightsResult.value : []);
  const onlineAtc =
    whazzupAtc.length > 0 ? whazzupAtc : asArray(atcResult.status === "fulfilled" ? atcResult.value : []);

  const getDepartureIcao = (flight: unknown) =>
    extractIcao((flight as { departure?: unknown }).departure) ??
    extractIcao((flight as { departureId?: unknown }).departureId) ??
    extractIcao((flight as { flightPlan?: { departureId?: unknown } }).flightPlan?.departureId) ??
    extractIcao((flight as { origin?: unknown }).origin) ??
    extractIcao((flight as { from?: unknown }).from) ??
    extractIcao((flight as { dep?: unknown }).dep);

  const getArrivalIcao = (flight: unknown) =>
    extractIcao((flight as { arrival?: unknown }).arrival) ??
    extractIcao((flight as { arrivalId?: unknown }).arrivalId) ??
    extractIcao((flight as { flightPlan?: { arrivalId?: unknown } }).flightPlan?.arrivalId) ??
    extractIcao((flight as { destination?: unknown }).destination) ??
    extractIcao((flight as { to?: unknown }).to) ??
    extractIcao((flight as { arr?: unknown }).arr);

  const departingFlights = flights.reduce((acc, flight) => {
    const dep = getDepartureIcao(flight);
    return dep && airportIcaos.has(dep) ? acc + 1 : acc;
  }, 0);

  const arrivingFlights = flights.reduce((acc, flight) => {
    const arr = getArrivalIcao(flight);
    return arr && airportIcaos.has(arr) ? acc + 1 : acc;
  }, 0);

  const getAtcStationIcao = (atc: unknown): string | undefined =>
    extractIcao(
      (atc as { station?: unknown }).station ??
        (atc as { airport?: unknown }).airport ??
        (atc as { icao?: unknown }).icao ??
        (atc as { icaoCode?: unknown }).icaoCode ??
        (atc as { icao_code?: unknown }).icao_code ??
        (atc as { location?: { icao?: unknown } }).location?.icao ??
        (atc as { atis?: unknown }).atis ??
        (atc as { aerodrome?: unknown }).aerodrome,
    );

  const atcInPortugal = onlineAtc.filter((atc) => {
    const callsign =
      typeof (atc as { callsign?: string }).callsign === "string"
        ? (atc as { callsign: string }).callsign.toUpperCase()
        : "";
    const stationIcao = getAtcStationIcao(atc);
    const firCode = extractIcao((atc as { fir?: unknown }).fir ?? (atc as { sector?: unknown }).sector);

    return callsign.startsWith("LP") || (stationIcao?.startsWith("LP") ?? false) || (firCode?.startsWith("LP") ?? false);
  });

  const highlightedAtc = atcInPortugal.slice(0, 4).map((atc) => ({
    callsign:
      typeof (atc as { callsign?: string }).callsign === "string"
        ? (atc as { callsign: string }).callsign
        : t("atcFallbackCallsign"),
    controller:
      typeof (atc as { realname?: string }).realname === "string"
        ? (atc as { realname: string }).realname
        : typeof (atc as { fullname?: string }).fullname === "string"
          ? (atc as { fullname: string }).fullname
          : typeof (atc as { name?: string }).name === "string"
            ? (atc as { name: string }).name
            : undefined,
    frequency:
      typeof (atc as { frequency?: string | number }).frequency === "string" ||
      typeof (atc as { frequency?: string | number }).frequency === "number"
        ? String((atc as { frequency: string | number }).frequency)
        : typeof (atc as { freq?: string | number }).freq === "string" ||
            typeof (atc as { freq?: string | number }).freq === "number"
          ? String((atc as { freq: string | number }).freq)
          : undefined,
  }));

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);

  const upcomingEvents = events.filter((event) => event.startTime >= now);
  const nextEvent = upcomingEvents[0];

  const feedItems = [
    ...upcomingEvents.map((event) => ({
      id: event.id,
      title: event.title,
      time: event.startTime,
      subtitle: event.airports.map((a) => a.icao).join(", ") || event.firs.map((f) => f.slug).join(", "),
      href: `/${locale}/events/${event.slug}`,
      kind: "event" as const,
    })),
    ...upcomingExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      time: exam.dateTime,
      subtitle: exam.description ?? "",
      href: exam.link ?? `/${locale}/training`,
      kind: "exam" as const,
    })),
    ...upcomingSessions.map((sessionItem) => ({
      id: sessionItem.id,
      title: sessionItem.type,
      time: sessionItem.dateTime,
      subtitle: sessionItem.instructor
        ? `${sessionItem.user?.vid ?? sessionItem.user?.name ?? "Pilot"} | ${sessionItem.instructor.name ?? sessionItem.instructor.vid ?? "Instructor"}`
        : sessionItem.user?.vid ?? sessionItem.user?.name ?? "",
      href: `/${locale}/training`,
      kind: "session" as const,
    })),
  ]
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 4);

  const latestNote = trainingRequestsWithNotes.find((req) => req.message);
  const firstName = session?.user?.name?.split(" ")[0] ?? session?.user?.vid;
  const manualTopics = [
    t("manualsTopicSops"),
    t("manualsTopicPhraseology"),
    t("manualsTopicBriefings"),
  ];

  return (
    <main className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[#0b1324] text-white shadow-lg">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url(/frontpic.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1324]/90 via-[#0f172a]/85 to-[#0b1324]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.2),transparent_30%)]" />
        <div className="relative grid gap-10 p-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <Badge className="bg-white/10 text-white backdrop-blur">{t("badge")}</Badge>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              {session?.user ? t("signedInTitle", { name: firstName ?? "" }) : t("title")}
            </h1>
            <p className="max-w-2xl text-lg text-white/80">
              {session?.user ? t("signedInSubtitle") : t("subtitle")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/${locale}/dashboard`}>
                <Button>{t("ctaDashboard")}</Button>
              </Link>
              <Link href={`/${locale}/events`}>
                <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                  {t("ctaEvents")}
                </Button>
              </Link>
              <Link href="https://events.pt.ivao.aero/" target="_blank" rel="noreferrer">
                <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                  {t("ctaTours")}
                </Button>
              </Link>
              <Link href={`/${locale}/login`}>
                <Button variant="ghost" className="px-0 text-white hover:text-white/80">
                  {t("ctaJoin")} -&gt;
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">{t("heroStatsTitle")}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: t("statDeparting"), value: departingFlights },
                  { label: t("statArriving"), value: arrivingFlights },
                  { label: t("statAtcOnline"), value: atcInPortugal.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-left"
                  >
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/60">{item.label}</p>
                    <p className="text-3xl font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/events`}
                  className="inline-block text-sm text-white hover:text-white/80"
                >
                  {t("ctaEvents")} -&gt;
                </Link>
                <Link
                  href="https://events.pt.ivao.aero/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm text-white hover:text-white/80"
                >
                  {t("ctaTours")} -&gt;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] via-[color:var(--surface-3)] to-[color:var(--surface-2)] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(44,107,216,0.22),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(246,178,60,0.18),transparent_40%)]" />
          <div className="relative space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">{t("summaryEventsTitle")}</p>
            <h3 className="text-xl font-semibold">{nextEvent?.title ?? t("summaryEventsFallback")}</h3>
            <p className="text-sm text-white/80">
              {nextEvent
                ? `${formatDateTime(nextEvent.startTime)} | ${nextEvent.airports.map((a) => a.icao).join(", ") || nextEvent.firs.map((f) => f.slug).join(", ")}`
                : t("eventsDescription")}
            </p>
            <Link href={`/${locale}/events`}>
              <Button
                size="sm"
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                {t("ctaEvents")}
              </Button>
            </Link>
          </div>
        </Card>
        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[#0f172a] via-[#162541] to-[#0f172a] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(236,72,153,0.2),transparent_50%)]" />
          <div className="relative space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">{t("summaryToursTitle")}</p>
            <h3 className="text-xl font-semibold">{t("summaryToursHeadline")}</h3>
            <p className="text-sm text-white/80">{t("summaryToursBody")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="https://events.pt.ivao.aero/" target="_blank" rel="noreferrer">
                <Button
                  size="sm"
                  variant="secondary"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  {t("summaryToursCta")}
                </Button>
              </Link>
              <Link href={`/${locale}/events`}>
                <Button size="sm" variant="ghost" className="px-0 text-white hover:text-white/80">
                  {t("summaryToursAltCta")} -&gt;
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] via-[color:var(--surface-3)] to-[color:var(--surface-2)] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.16),transparent_45%)]" />
          <div className="relative space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/70">{t("summaryAirspaceTitle")}</p>
            <h3 className="text-xl font-semibold">
              {atcInPortugal.length} {t("statAtcOnline")} | {arrivingFlights + departingFlights} {t("summaryAirspaceTraffic")}
            </h3>
            <p className="text-sm text-white/80">{t("summaryAirspaceBody")}</p>
            <div className="space-y-2">
              {highlightedAtc.length === 0 ? (
                <p className="text-xs text-white/70">{t("summaryAirspaceFallback")}</p>
              ) : (
                highlightedAtc.map((atc) => (
                  <div
                    key={`${atc.callsign}-${atc.frequency ?? "freq"}`}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{atc.callsign}</p>
                      <p>{atc.controller ?? t("atcFallbackCallsign")}</p>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.1em]">
                      {atc.frequency ?? t("atcFallbackFrequency")}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {featuredAirports.map((airport) => (
                <span
                  key={airport.icao}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80"
                >
                  {airport.icao} | {airport.fir?.slug ?? "FIR"}
                </span>
              ))}
            </div>
            <Link
              href={`/${locale}/airports`}
              className="inline-flex items-center text-sm text-white hover:text-white/80"
            >
              {t("summaryAirspaceCta")} -&gt;
            </Link>
          </div>
        </Card>
      </section>

      <SectionHeader
        eyebrow={t("platformEyebrow")}
        title={t("platformTitle")}
        description={t("platformDescription")}
      />

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <SectionHeader
            title={t("feedTitle")}
            description={t("feedDescription")}
            className="mb-2"
          />
          <div className="space-y-3">
            {feedItems.length === 0 ? (
              <p className="text-sm text-[color:var(--text-muted)]">{t("feedEmpty")}</p>
            ) : (
              <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [-ms-overflow-style:none]">
                  {feedItems.map((item) => (
                    <div
                      key={item.id}
                      className="min-w-[240px] max-w-[280px] snap-start rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        <span>{formatDateTime(item.time)}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                            item.kind === "event"
                              ? "bg-[color:var(--primary-muted)] text-[color:var(--primary)]"
                              : "bg-[color:var(--surface-3)] text-[color:var(--text-primary)]"
                          }`}
                        >
                          {item.kind}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-[color:var(--text-primary)]">{item.title}</p>
                      <p className="text-xs text-[color:var(--text-muted)]">
                        {item.subtitle || t("feedEmpty")}
                      </p>
                      <Link href={item.href} className="mt-4 inline-flex">
                        <Button size="sm" variant="secondary">
                          {item.kind === "event" ? t("ctaEvents") : t("ctaTraining")}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] via-[#0f172a] to-[color:var(--surface-3)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_35%)]" />
          <div className="relative space-y-3">
            <SectionHeader
              title={t("manualsTitle")}
              description={t("manualsDescription")}
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {manualTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-3)] px-3 py-1 text-xs text-[color:var(--text-primary)]"
                >
                  {topic}
                </span>
              ))}
            </div>
            <p className="text-sm text-[color:var(--text-muted)]">{t("manualsBody")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/${locale}/training`}>
                <Button size="sm">{t("manualsCta")}</Button>
              </Link>
              <Link href={`/${locale}/airports`}>
                <Button size="sm" variant="ghost">
                  {t("manualsSecondaryCta")} -&gt;
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <SectionHeader title={t("firsTitle")} description={t("firsDescription")} />
      <div className="grid gap-4 md:grid-cols-3">
        {firs.map((fir) => (
          <Card key={fir.id} className="space-y-2 bg-[color:var(--surface-2)]">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{fir.slug}</p>
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">{fir.name}</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              {fir.airports.length} {t("statAirports")} | {fir.events.length} {t("statEvents")}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <SectionHeader title={t("statsTitle")} description={t("statsDescription")} />
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: t("statUsers"), value: userCount },
              { label: t("statEvents"), value: events.length },
              { label: t("statAirports"), value: airportsCount },
              { label: t("statFirs"), value: firs.length },
              { label: t("statDeparting"), value: departingFlights },
              { label: t("statArriving"), value: arrivingFlights },
              { label: t("statAtcOnline"), value: atcInPortugal.length },
              { label: t("statExams"), value: upcomingExams.length },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4"
              >
                <p className="text-sm text-[color:var(--text-muted)]">{item.label}</p>
                <p className="text-3xl font-bold text-[color:var(--primary)]">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionHeader title={t("feedbackTitle")} />
          {latestNote ? (
            <>
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">
                {latestNote.message}
              </p>
              <p className="text-sm text-[color:var(--text-muted)]">
                {latestNote.user?.name ?? latestNote.user?.vid ?? t("feedbackAuthor")}
              </p>
            </>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">{t("feedbackEmpty")}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href={`/${locale}/login`}>
              <Button variant="secondary" size="sm">
                {t("ctaJoin")}
              </Button>
            </Link>
            <Link href={`/${locale}/training`}>
              <Button variant="ghost" size="sm" className="px-0">
                {t("ctaTraining")} -&gt;
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
