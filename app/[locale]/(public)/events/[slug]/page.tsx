import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import type { JSX } from "react";
import { RegistrationButton } from "@/components/events/registration-button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { absoluteUrl } from "@/lib/seo";
import { EventActions } from "@/components/events/event-actions";
import { parseEventLayout } from "@/lib/event-layout";
import type { EventLayoutData } from "@/components/puck/event-context";
import { type Data } from "@measured/puck";
import { EventPuckRendererClient } from "@/components/puck/event-renderer-client";

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
};

type EditorBlock = { type?: string; data?: Record<string, unknown> };

const getEventForMeta = (slug: string) =>
  unstable_cache(
    () =>
      prisma.event.findUnique({
        where: { slug },
        select: { title: true, description: true, bannerUrl: true, isPublished: true, slug: true },
      }),
    ["event-meta", slug],
    { revalidate: 300 },
  )();

const getEventDetail = (slug: string) =>
  unstable_cache(
    () =>
      prisma.event.findUnique({
        where: { slug },
        include: {
          airports: { select: { icao: true } },
          firs: { select: { slug: true } },
          registrations: {
            include: { user: { select: { id: true, name: true, avatarUrl: true, avatarColor: true } } },
          },
        },
      }),
    ["event-detail", slug],
    { revalidate: 300 },
  )();

const asPlainText = (value: string | null | undefined) => {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value) as { blocks?: EditorBlock[] };
    if (parsed?.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      const texts = parsed.blocks
        .map((block) => {
          const text = (block.data?.text as string) ?? "";
          return text.replace(/<[^>]+>/g, "").trim();
        })
        .filter(Boolean);
      if (texts.length) return texts.join(" ");
    }
  } catch {
    // fall through
  }
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug = "" } = await params;
  if (!slug) {
    return {
      title: "Event not available",
      robots: { index: false, follow: false },
    };
  }
  const event = await getEventForMeta(slug);

  if (!event || !event.isPublished) {
    return {
      title: "Event not available",
      robots: { index: false, follow: false },
    };
  }

  const description = asPlainText(event.description).slice(0, 160) || "IVAO Portugal event details.";
  const canonical = absoluteUrl(`/${locale}/events/${event.slug}`);

  return {
    title: event.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: event.title,
      description,
      url: canonical,
      images: event.bannerUrl ? [{ url: event.bannerUrl }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const { locale, slug = "" } = await params;
  if (!slug) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "events" });
  const session = await auth();

  const event = await getEventDetail(slug);

  const isStaff = session?.user && session.user.role !== "USER";

  if (!event) {
    notFound();
  }

  if (event.slug !== slug) {
    redirect(`/${locale}/events/${event.slug}`);
  }

  if (!event.isPublished && !isStaff) {
    redirect(`/${locale}/events`);
  }

  const isRegistered = Boolean(
    session?.user?.id && event.registrations.some((r) => r.userId === session.user?.id),
  );

  const toDateOrNull = (value: string | Date | null | undefined) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const startDate = toDateOrNull(event.startTime);
  const endDate = toDateOrNull(event.endTime);
  const updatedAt = toDateOrNull(event.updatedAt);

  if (!startDate || !endDate) {
    notFound();
  }

  const start = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(startDate);
  const end = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(endDate);

  const timeframe = `${t("starts")}: ${start} | ${t("ends")}: ${end}`;
  const divisions = (() => {
    if (!event.divisions) return [];
    try {
      const parsed = JSON.parse(event.divisions);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).toUpperCase()).filter(Boolean);
    } catch {
      // fall through
    }
    return event.divisions
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
  })();
  const routeDisplay = (() => {
    if (!event.routes) return null;

    const toText = (value: unknown) => {
      if (typeof value === "string") return value.trim();
      if (typeof value === "number") return String(value);
      return "";
    };

    const toLabel = (value: unknown) => {
      if (typeof value === "string") return value.trim() || null;
      if (!value || typeof value !== "object") return null;
      const obj = value as Record<string, unknown>;
      const from =
        toText(obj.from ?? obj.departure ?? obj.origin ?? obj.dep ?? obj.start ?? obj.outbound) ||
        toText(Array.isArray(obj.airports) ? (obj.airports as unknown[])[0] : obj.airport);
      const to =
        toText(obj.to ?? obj.arrival ?? obj.destination ?? obj.arr ?? obj.end ?? obj.inbound) ||
        toText(Array.isArray(obj.airports) ? (obj.airports as unknown[])[1] : "");
      const route = toText(obj.route ?? obj.via ?? obj.path);
      const title = toText(obj.title ?? obj.name ?? obj.callsign);
      if (from || to) {
        const segment = [from, to].filter(Boolean).join("-");
        return route ? `${segment} ${route}`.trim() : segment;
      }
      if (title && route) return `${title} ${route}`.trim();
      if (route) return route;
      if (title) return title;
      return null;
    };

    const normalizeArray = (items: unknown[]) => {
      const labels = items
        .map((item) => toLabel(item) ?? (typeof item === "string" ? item.trim() : null))
        .filter((item): item is string => Boolean(item));
      if (labels.length) return { badges: labels } as const;
      return { text: JSON.stringify(items, null, 2) } as const;
    };

    try {
      const parsed = JSON.parse(event.routes);
      if (Array.isArray(parsed)) return normalizeArray(parsed);
      if (typeof parsed === "string") return { text: parsed } as const;
      if (parsed && typeof parsed === "object") {
        const nested =
          (parsed as { routes?: unknown }).routes ??
          (parsed as { legs?: unknown }).legs ??
          (parsed as { segments?: unknown }).segments;
        if (Array.isArray(nested)) return normalizeArray(nested);
        const label = toLabel(parsed);
        if (label) return { badges: [label] } as const;
        return { text: JSON.stringify(parsed, null, 2) } as const;
      }
      return { text: String(parsed) } as const;
    } catch {
      return { text: event.routes } as const;
    }
  })();
  const hasDetails = Boolean(
    event.eventType || event.infoUrl || event.hqeAward || divisions.length || routeDisplay,
  );
  const statusLabel = event.isPublished ? "Published" : "Draft";
  const updatedLabel = updatedAt ? updatedAt.toLocaleString(locale) : null;
  const updatedIso = updatedAt ? updatedAt.toISOString() : null;
  const updatedTooltipId = "event-updated-tooltip";
  const eventUrl = absoluteUrl(`/${locale}/events/${event.slug}`);
  const eventLocation =
    event.airports.length > 0
      ? event.airports.map((a) => a.icao).join(", ")
      : event.firs.length > 0
        ? event.firs.map((f) => f.slug).join(", ")
        : "";
  const eventDescription = asPlainText(event.description);
  const puckData = parseEventLayout(event.puckLayout);
  const puckRenderData = puckData ? ({ ...puckData, root: puckData.root ?? {} } as Data) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: asPlainText(event.description),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: absoluteUrl(`/${locale}/events/${event.slug}`),
    },
    organizer: {
      "@type": "Organization",
      name: "IVAO Portugal",
      url: absoluteUrl(`/${locale}/home`),
    },
    image: event.bannerUrl ? [event.bannerUrl] : undefined,
  };

  const renderDescription = () => {
    if (!event.description) return <p className="text-sm text-[color:var(--text-muted)]">{t("detailDescription")}</p>;
    try {
      const parsed = JSON.parse(event.description) as { blocks?: EditorBlock[] };
      if (parsed?.blocks && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return (
          <div className="space-y-3 text-sm text-[color:var(--text-muted)]">
            {parsed.blocks.map((block, idx) => {
              if (block.type === "header") {
                const level = Number((block.data?.level as number) ?? 3);
                const text = (block.data?.text as string) ?? "";
                const Tag = (`h${level}` as keyof JSX.IntrinsicElements) || "h3";
                return (
                  <Tag key={idx} className="text-[color:var(--text-primary)]">
                    {text}
                  </Tag>
                );
              }
              if (block.type === "list") {
                const items = Array.isArray(block.data?.items) ? block.data?.items : [];
                const style = block.data?.style === "ordered" ? "ol" : "ul";
                const ListTag = style as "ul" | "ol";
                return (
                  <ListTag key={idx} className="ml-4 list-disc text-[color:var(--text-muted)]">
                    {items.map((item, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: String(item) }} />
                    ))}
                  </ListTag>
                );
              }
              const text = (block.data?.text as string) ?? "";
              return (
                <p key={idx} className="text-[color:var(--text-muted)]" dangerouslySetInnerHTML={{ __html: text }} />
              );
            })}
          </div>
        );
      }
    } catch {
      // fall back to plain text render below
    }
    // Treat as HTML if it looks like markup
    const looksLikeHtml = /<\w+[^>]*>/.test(event.description);
    if (looksLikeHtml) {
      return (
        <div
          className="prose prose-invert max-w-none prose-p:my-2 prose-li:my-1 prose-h3:text-[color:var(--text-primary)]"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      );
    }
    // If plain text, show with preserved paragraphs.
    const paragraphs = event.description.split(/\n+/).filter((p) => p.trim().length > 0);
    return (
      <div className="space-y-2 text-sm text-[color:var(--text-muted)]">
        {paragraphs.length
          ? paragraphs.map((p, idx) => (
              <p key={idx} className="text-[color:var(--text-muted)]">
                {p}
              </p>
            ))
          : event.description}
      </div>
    );
  };

  const buildPuckContext = (): EventLayoutData => ({
    id: event.id,
    slug: event.slug,
    locale,
    title: event.title,
    description: event.description ?? "",
    bannerUrl: event.bannerUrl ?? null,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    startLabel: start,
    endLabel: end,
    timeframe,
    statusLabel,
    updatedLabel: updatedLabel ?? null,
    updatedIso: updatedIso ?? null,
    airports: event.airports.map((a) => a.icao),
    firs: event.firs.map((f) => f.slug),
    divisions,
    eventType: event.eventType ?? null,
    infoUrl: event.infoUrl ?? null,
    hqeAward: event.hqeAward ?? false,
    routes: event.routes ?? null,
    registrations: event.registrations.map((reg) => ({
      id: reg.id,
      name: reg.user.name ?? reg.user.id,
      avatarUrl: reg.user.avatarUrl ?? null,
      avatarColor: reg.user.avatarColor ?? null,
    })),
    registrationsCount: event.registrations.length,
    eventUrl,
    eventLocation,
    isRegistered,
    registerLabel: t("register"),
    unregisterLabel: t("unregister"),
  });

  if (puckData) {
    return (
      <main className="space-y-6">
        <div className="mx-auto w-full max-w-6xl">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          {puckRenderData ? <EventPuckRendererClient data={puckRenderData} context={buildPuckContext()} /> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <div className="mx-auto w-full max-w-6xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="relative rounded-3xl border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] to-[color:var(--surface-3)] p-4 shadow-lg sm:p-6">
        {event.bannerUrl ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-[color:var(--border)]" style={{ minHeight: "180px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.bannerUrl} alt={`${event.title} banner`} className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-full flex-col gap-2 rounded-2xl rounded-l-none border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 p-2 shadow-lg md:flex">
          <EventActions
            title={event.title}
            startIso={startDate.toISOString()}
            endIso={endDate.toISOString()}
            url={eventUrl}
            location={eventLocation}
            description={eventDescription}
            layout="stacked"
            calendarLabel="Calendar"
            shareLabel="Share"
            showLabels={false}
            buttonClassName="h-10 rounded-l-none bg-[color:var(--surface-3)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
          />
          <div className="group relative">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl rounded-l-none border border-[color:var(--border)] bg-[color:var(--surface-3)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-2)]"
              aria-label={updatedLabel ? `Last updated ${updatedLabel}` : "Last updated time unavailable"}
              aria-describedby={updatedTooltipId}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm-1 3v5.2l4.1 2.4 1-1.7-3.1-1.8V7H11z"
                  fill="currentColor"
                />
              </svg>
              <span className="sr-only">{updatedLabel ?? "Updated"}</span>
            </button>
            <div className="pointer-events-none absolute right-full top-1/2 z-10 hidden -translate-y-1/2 pr-2 group-hover:block group-focus-within:block">
              <div
                id={updatedTooltipId}
                role="tooltip"
                className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-2)] px-2 py-1 text-[11px] text-[color:var(--text-primary)] shadow-lg"
              >
                {updatedLabel ? `Last updated ${updatedLabel}` : "Last updated time unavailable"}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-muted)]">{t("title")}</p>
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)] sm:text-3xl">{event.title}</h1>
            <p className="text-sm text-[color:var(--text-muted)]">{timeframe}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]" />
            <div className="flex flex-wrap gap-2 text-xs">
              {event.airports.map((a) => (
                <span key={a.icao} className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]">
                  {a.icao}
                </span>
              ))}
              {event.firs.map((f) => (
                <span key={f.slug} className="rounded-full bg-[color:var(--surface-3)] px-3 py-1 text-[color:var(--text-primary)]">
                  {f.slug}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            {session?.user ? (
              <RegistrationButton
                eventId={event.id}
                eventSlug={event.slug}
                locale={locale}
                isRegistered={isRegistered}
                labels={{ register: t("register"), unregister: t("unregister") }}
              />
            ) : (
              <p className="text-xs text-[color:var(--text-muted)]">Sign in to register for this event.</p>
            )}
            <div className="flex flex-wrap gap-2 md:hidden">
              <EventActions
                title={event.title}
                startIso={startDate.toISOString()}
                endIso={endDate.toISOString()}
                url={eventUrl}
                location={eventLocation}
                description={eventDescription}
                calendarLabel="Calendar"
                shareLabel="Share"
                showLabels={false}
                buttonClassName="h-10 rounded-l-none bg-[color:var(--surface-3)] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-2)]"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("starts")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{start}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("ends")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{end}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">{t("friends")}</p>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("goingCount", { count: event.registrations.length })}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Card className="space-y-4 p-4">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Overview</p>
          {renderDescription()}
        </Card>

        <div className="space-y-4">
          {hasDetails ? (
            <Card className="space-y-3 p-4">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Details</p>
              <div className="space-y-3 text-sm text-[color:var(--text-muted)]">
                {event.eventType ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Type</span>
                    <span className="text-[color:var(--text-primary)]">{event.eventType}</span>
                  </div>
                ) : null}
                {event.hqeAward ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Award</span>
                    <span className="text-[color:var(--text-primary)]">HQE Award</span>
                  </div>
                ) : null}
                {event.infoUrl ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Briefing</span>
                    <a href={event.infoUrl} target="_blank" rel="noreferrer" className="text-[color:var(--primary)] underline">
                      Open
                    </a>
                  </div>
                ) : null}
                {divisions.length ? (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Divisions</p>
                    <div className="flex flex-wrap gap-2">
                      {divisions.map((division) => (
                        <span key={division} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-primary)]">
                          {division}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {routeDisplay ? (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-muted)]">Routes</p>
                    {routeDisplay.badges ? (
                      <div className="flex flex-wrap gap-2">
                        {routeDisplay.badges.map((route) => (
                          <span key={route} className="rounded-full bg-[color:var(--surface-3)] px-2 py-1 text-xs text-[color:var(--text-primary)]">
                            {route}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-xs text-[color:var(--text-muted)]">{routeDisplay.text}</pre>
                    )}
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{t("friends")}</p>
              <p className="text-xs text-[color:var(--text-muted)]">{t("goingCount", { count: event.registrations.length })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {event.registrations.map((reg) => (
                <span
                  key={reg.id}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-1 text-sm text-[color:var(--text-primary)]"
                >
                  <UserAvatar
                    name={reg.user.name ?? reg.user.id}
                    src={reg.user.avatarUrl ?? null}
                    colorKey={reg.user.avatarColor ?? null}
                    size={24}
                    className="text-[10px]"
                  />
                  {reg.user.name ?? reg.user.id}
                </span>
              ))}
              {event.registrations.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">{t("emptyRegistrations")}</p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  </main>
);
}
