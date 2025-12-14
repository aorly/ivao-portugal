import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { PilotAirportTabs } from "@/components/home/pilot-airport-tabs";
import { createAtcBookingAction } from "./actions";
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

  const [whazzupResult, flightsResult, atcResult, bookingsResult] = await Promise.allSettled([
    ivaoClient.getWhazzup(),
    ivaoClient.getFlights(),
    ivaoClient.getOnlineAtc(),
    ivaoClient.getAtcBookings(),
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
  const getCallsign = (flight: unknown): string | undefined => {
    const raw =
      (flight as { callsign?: string }).callsign ??
      (flight as { flightId?: string }).flightId ??
      (flight as { id?: string }).id;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    return undefined;
  };

  const getAircraftType = (flight: unknown): string | undefined => {
    const candidate =
      (flight as { aircraftType?: string }).aircraftType ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.type ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.model ??
      (flight as { aircraft?: { type?: string; model?: string; icao?: string } }).aircraft?.icao ??
      (flight as { flightPlan?: { aircraft?: string; aircraftType?: string } }).flightPlan?.aircraft ??
      (flight as { flightPlan?: { aircraft?: string; aircraftType?: string } }).flightPlan?.aircraftType;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim().toUpperCase();
    return undefined;
  };

  const getFlightState = (flight: unknown): string | undefined => {
    const base =
      (flight as { state?: string }).state ??
      (flight as { status?: string }).status ??
      (flight as { phase?: string }).phase ??
      (flight as { flightPhase?: string }).flightPhase;

    const lastTrack = (flight as { lastTrack?: { state?: string; phase?: string; groundState?: string; onGround?: boolean; groundSpeed?: number } }).lastTrack;
    const trackState =
      lastTrack?.state ??
      lastTrack?.phase ??
      lastTrack?.groundState;

    const cleaned = typeof (base ?? trackState) === "string" ? (base ?? trackState)!.trim() : undefined;
    if (cleaned) return cleaned;

    // Derive a friendly status from ground/air data when explicit state is missing.
    const onGround = typeof lastTrack?.onGround === "boolean" ? lastTrack.onGround : undefined;
    const groundSpeed =
      typeof lastTrack?.groundSpeed === "number"
        ? lastTrack.groundSpeed
        : typeof (flight as { groundSpeed?: number }).groundSpeed === "number"
          ? (flight as { groundSpeed: number }).groundSpeed
          : undefined;

    if (onGround) {
      if (groundSpeed && groundSpeed > 10) return "Taxi";
      return "On Stand";
    }

    return "En Route";
  };
  const flightsForAirports = flights
    .map((flight, idx) => {
      const dep = getDepartureIcao(flight);
      const arr = getArrivalIcao(flight);
      const hasDep = dep && airportIcaos.has(dep);
      const hasArr = arr && airportIcaos.has(arr);
      if (!hasDep && !hasArr) return null;
      const direction = hasDep ? "DEP" : "ARR";
      const matched = hasDep ? dep : arr;
      const other = hasDep ? arr : dep;
      const id =
        (flight as { id?: string | number }).id?.toString() ??
        (flight as { callsign?: string }).callsign ??
        `${matched}-${direction}-${idx}`;
      return {
        id,
        direction,
        icao: matched ?? "UNK",
        other: other ?? undefined,
        callsign: getCallsign(flight),
        aircraft: getAircraftType(flight),
        state: getFlightState(flight),
      };
    })
    .filter(Boolean) as { id: string; direction: "DEP" | "ARR"; icao: string; other?: string }[];

  const bookingsRaw = asArray(bookingsResult.status === "fulfilled" ? bookingsResult.value : []);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const parseDate = (value: unknown): Date | null => {
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };
  const bookingsToday = bookingsRaw
    .map((booking) => {
      const start = parseDate((booking as { startTime?: unknown }).startTime ?? (booking as { start?: unknown }).start);
      const end = parseDate((booking as { endTime?: unknown }).endTime ?? (booking as { end?: unknown }).end);
      if (!start || !end) return null;
      if (start >= todayEnd || end <= todayStart) return null;
      const callsign =
        (booking as { callsign?: string }).callsign ??
        (booking as { station?: string }).station ??
        (booking as { name?: string }).name;
      const icao = extractIcao(
        (booking as { icao?: unknown }).icao ??
          (booking as { station?: unknown }).station ??
          (booking as { airport?: unknown }).airport ??
          (booking as { aerodrome?: unknown }).aerodrome,
      );
      if (!(icao?.startsWith("LP") ?? false)) return null;
      return {
        id:
          (booking as { id?: string | number }).id?.toString() ??
          `${callsign ?? icao}-${start.toISOString()}`,
        callsign: callsign ?? `${icao} ATC`,
        icao,
        window: `${start.toUTCString().slice(17, 22)} - ${end.toUTCString().slice(17, 22)}z`,
      };
    })
    .filter(Boolean)
    .slice(0, 6) as { id: string; callsign: string; icao?: string; window: string }[];

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(date);
  const formatInputDateTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const bookingStartDefault = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingEndDefault = (() => {
    const d = new Date();
    d.setHours(1, 0, 0, 0);
    return formatInputDateTime(d);
  })();
  const bookingMaxToday = (() => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return formatInputDateTime(d);
  })();

  const upcomingEvents = events.filter((event) => event.startTime >= now);

  const latestNote = trainingRequestsWithNotes.find((req) => req.message);
  const firstName = session?.user?.name?.split(" ")[0] ?? session?.user?.vid;
  const manualTopics = [
    t("manualsTopicSops"),
    t("manualsTopicPhraseology"),
    t("manualsTopicBriefings"),
  ];
  const snapshotStats = [
    { label: t("statUsers"), value: userCount },
    { label: t("statEvents"), value: events.length },
    { label: t("statAirports"), value: airportsCount },
    { label: t("statFirs"), value: firs.length },
    { label: t("statDeparting"), value: departingFlights },
    { label: t("statArriving"), value: arrivingFlights },
    { label: t("statAtcOnline"), value: atcInPortugal.length },
    { label: t("statExams"), value: upcomingExams.length },
  ];
  const lineupEvents = (upcomingEvents.length > 0 ? upcomingEvents : events).slice(0, 3);
  const fallbackAtcStations =
    featuredAirports.length > 0
      ? featuredAirports.map((airport) => ({
          code: airport.icao,
          label: `${airport.icao} ${airport.fir?.slug ?? "FIR"}`,
        }))
      : [
          { code: "LPPT", label: "LPPT | LIS" },
          { code: "LPPR", label: "LPPR | OPO" },
          { code: "LPFR", label: "LPFR | FAO" },
        ];

  return (
    <main className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[#0b1324] text-white shadow-lg">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url(/frontpic.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1324]/92 via-[#0f172a]/88 to-[#0b1324]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.28),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.2),transparent_30%)]" />
        <div className="relative mx-auto max-w-5xl space-y-8 p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            <span>{t("badge")}</span>
          </div>
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
        </div>
      </section>

      <section className="mt-[-0.5rem]">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: t("statDeparting"), value: departingFlights },
            { label: t("statArriving"), value: arrivingFlights },
            { label: t("statAtcOnline"), value: atcInPortugal.length },
          ].map((item) => (
            <Card
              key={item.label}
              className="flex items-center justify-between border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2.5 shadow-sm"
            >
              <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
                {item.label}
              </span>
              <span className="text-2xl font-bold text-[color:var(--primary)]">{item.value}</span>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[#0f172a] via-[#13233f] to-[#0f172a] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(236,72,153,0.18),transparent_50%)]" />
          <div className="relative flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{t("summaryAirspaceTitle")}</p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold">
                {atcInPortugal.length} {t("statAtcOnline")}
              </span>
            </div>
            <div className="grid gap-2 overflow-y-auto pr-1" style={{ maxHeight: "260px" }}>
              {highlightedAtc.length === 0 ? (
                <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/80">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{t("summaryAirspaceFallback")}</p>
                      <p className="text-[11px] text-white/70">
                        Join Portugal ATC roster and keep LP airspace alive. Staff support and training available.
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-white/70">LP network</span>
                  </div>
                </div>
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
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/80">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em]">
                <span>ATC bookings today</span>
              </div>
              <div className="grid gap-2 max-h-[140px] overflow-y-auto pr-1">
                {bookingsToday.length === 0 ? (
                  <p className="text-[11px] text-white/70">No bookings yet. Grab a slot and staff will support.</p>
                ) : (
                  bookingsToday.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">{b.callsign}</p>
                        <p className="text-[11px] uppercase tracking-[0.1em]">{b.icao ?? "LP"}</p>
                      </div>
                      <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.1em]">
                        {b.window}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {session?.user ? (
                <form
                  action={createAtcBookingAction}
                  className="space-y-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-[11px]"
                >
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-white/80">
                    <span>Book a station</span>
                    <span className="text-[10px] text-white/60">UTC</span>
                  </div>
                  <input
                    name="station"
                    placeholder="LPPT_TWR"
                    className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none placeholder:text-white/50"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                    name="start"
                    type="datetime-local"
                    defaultValue={bookingStartDefault}
                    min={bookingStartDefault}
                    max={bookingMaxToday}
                    className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none"
                  />
                  <input
                    name="end"
                    type="datetime-local"
                    defaultValue={bookingEndDefault}
                    min={bookingStartDefault}
                    max={bookingMaxToday}
                    className="w-full rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white outline-none"
                  />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-white/80">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="training" className="h-3 w-3 rounded border-white/30 bg-white/10" />
                      <span>Training</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" name="exam" className="h-3 w-3 rounded border-white/30 bg-white/10" />
                      <span>Exam</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-md border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:bg-white/15"
                  >
                    Submit Booking
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.1em]">
                  <span>Want to control?</span>
                  <Link href={`/${locale}/training`} className="font-semibold text-white underline">
                    Request Training
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[#0f172a] via-[#162541] to-[#0f172a] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_35%)]" />
          <div className="relative flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{t("summaryAirspaceTraffic")}</p>
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold">
                {flightsForAirports.length}
              </span>
            </div>
            <PilotAirportTabs
              flights={flightsForAirports}
              labels={{ title: t("summaryAirspaceTraffic"), empty: t("feedEmpty") }}
            />
          </div>
        </Card>
      </section>

      <SectionHeader
        eyebrow={t("platformEyebrow")}
        title={t("platformTitle")}
        description={t("platformDescription")}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-4 border-[color:var(--border)] bg-[color:var(--surface-2)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                {t("summaryEventsTitle")}
              </p>
              <p className="text-lg font-semibold text-[color:var(--text-primary)]">Line-up</p>
            </div>
            <Link href={`/${locale}/events`}>
              <Button size="sm" variant="ghost" className="px-0">
                {t("ctaEvents")} -&gt;
              </Button>
            </Link>
          </div>
          {lineupEvents.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">{t("summaryEventsFallback")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {lineupEvents.map((event) => (
                <div
                  key={event.id}
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-3)] shadow-sm"
                >
                  <div
                    className="h-24 bg-cover bg-center"
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, rgba(12,18,38,0.35) 0%, rgba(12,18,38,0.8) 100%), url(/frontpic.png)",
                    }}
                  />
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                      <span>{formatDateTime(event.startTime)}</span>
                      <span className="rounded-full bg-[color:var(--surface-2)] px-2 py-1 text-[10px] font-semibold text-[color:var(--primary)]">
                        {t("ctaEvents")}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{event.title}</p>
                    <p className="text-xs text-[color:var(--text-muted)]">
                      {event.airports.map((a) => a.icao).join(", ") || event.firs.map((f) => f.slug).join(", ")}
                    </p>
                    <div className="mt-auto pt-1">
                      <Link href={`/${locale}/events/${event.slug}`} className="inline-flex">
                        <Button size="sm" variant="secondary">
                          {t("ctaEvents")}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="relative overflow-hidden border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] via-[#0f172a] to-[color:var(--surface-3)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.12),transparent_35%)]" />
          <div className="relative space-y-3">
            <SectionHeader title={t("manualsTitle")} description={t("manualsDescription")} className="mb-2" />
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
          <Card key={fir.id} className="space-y-2 border-[color:var(--border)] bg-[color:var(--surface-3)]">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{fir.slug}</p>
            <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">{fir.name}</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              {fir.airports.length} {t("statAirports")} | {fir.events.length} {t("statEvents")}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="space-y-4 border-[color:var(--border)] bg-[color:var(--surface-2)]">
          <SectionHeader title={t("statsTitle")} description={t("statsDescription")} />
          <div className="grid gap-3 md:grid-cols-4">
            {snapshotStats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-3)] p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{item.label}</p>
                <p className="text-2xl font-bold text-[color:var(--primary)]">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-3 border-[color:var(--border)] bg-[color:var(--surface-2)]">
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
