"use server";

import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const formatEventSubtitle = (locale: string, startTime: Date, location: string) => {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(startTime);
  return location ? `${dateLabel} • ${location}` : dateLabel;
};

const resolveEventLocation = (airportIcaos: string[]) => {
  if (airportIcaos.length === 0) return "Portugal";
  return airportIcaos.join(", ");
};

const syncHeroSlideForEvent = async ({
  locale,
  slug,
  title,
  startTime,
  bannerUrl,
  infoUrl,
  isPublished,
  airportIcaos,
  previousSlug,
}: {
  locale: string;
  slug: string;
  title: string;
  startTime: Date;
  bannerUrl: string | null;
  infoUrl: string | null;
  isPublished: boolean;
  airportIcaos: string[];
  previousSlug?: string;
}) => {
  const currentHref = `/${locale}/events/${slug}`;
  const previousHref = previousSlug ? `/${locale}/events/${previousSlug}` : null;
  const existing = await prisma.heroSlide.findFirst({
    where: {
      locale,
      ctaHref: previousHref ?? currentHref,
    },
  });

  if (!isPublished) {
    if (existing) {
      await prisma.heroSlide.update({
        where: { id: existing.id },
        data: { isPublished: false },
      });
    }
    return;
  }

  const location = resolveEventLocation(airportIcaos);
  const subtitle = formatEventSubtitle(locale, startTime, location);
  const data = {
    locale,
    eyebrow: "Event",
    title,
    subtitle,
    imageUrl: bannerUrl,
    imageAlt: title,
    ctaLabel: "View event",
    ctaHref: currentHref,
    secondaryLabel: infoUrl ? "Briefing" : null,
    secondaryHref: infoUrl,
    isPublished: true,
  };

  if (existing) {
    await prisma.heroSlide.update({
      where: { id: existing.id },
      data: {
        ...data,
        order: existing.order,
        fullWidth: existing.fullWidth,
      },
    });
    return;
  }

  await prisma.heroSlide.create({
    data: {
      ...data,
      order: 20,
      fullWidth: false,
    },
  });
};
const ensure_admin_events = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:events");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};


function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseEventForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = formData.get("description") ? String(formData.get("description")) : "";
  const puckLayoutRaw = formData.get("puckLayout") ? String(formData.get("puckLayout")) : "";
  const puckLayout = puckLayoutRaw.trim() ? puckLayoutRaw : null;
  const slugInput = String(formData.get("slug") ?? "").trim();
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));
  const bannerUrl = formData.get("bannerUrl") ? String(formData.get("bannerUrl")) : null;
  const isPublished = formData.get("isPublished") === "on";
  const locale = String(formData.get("locale") ?? "en");
  const infoUrl = formData.get("infoUrl") ? String(formData.get("infoUrl")) : null;
  const eventType = formData.get("eventType") ? String(formData.get("eventType")) : null;
  const hqeAward = formData.get("hqeAward") === "on";
  const externalId = formData.get("externalId") ? String(formData.get("externalId")) : null;

  const divisionsRaw = String(formData.get("divisions") ?? "");
  const divisions = divisionsRaw
    ? JSON.stringify(
        divisionsRaw
          .split(",")
          .map((d) => d.trim().toUpperCase())
          .filter(Boolean),
      )
    : null;

  const routesRaw = formData.get("routes") ? String(formData.get("routes")) : "";
  let routes: string | null = null;
  if (routesRaw.trim()) {
    try {
      const parsed = JSON.parse(routesRaw);
      routes = JSON.stringify(parsed);
    } catch {
      routes = routesRaw;
    }
  }

  const airportsRaw = String(formData.get("airports") ?? "");
  const airportIcaos = airportsRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return {
    title,
    description,
    puckLayout,
    slugInput,
    startTime,
    endTime,
    bannerUrl,
    isPublished,
    airportIcaos,
    locale,
    infoUrl,
    eventType,
    divisions,
    routes,
    hqeAward,
    externalId,
  };
}

type ActionState = { success?: boolean; error?: string };

export async function createEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await ensure_admin_events();
  const {
    title,
    description,
    puckLayout,
    slugInput,
    startTime,
    endTime,
    bannerUrl,
    isPublished,
    airportIcaos,
    locale,
    infoUrl,
    eventType,
    divisions,
    routes,
    hqeAward,
    externalId,
  } = parseEventForm(formData);

  if (!title || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Invalid event data", success: false };
  }

  const slug = slugInput ? slugify(slugInput) : slugify(title);

  const airports = airportIcaos.length
    ? await prisma.airport.findMany({ where: { icao: { in: airportIcaos } }, select: { id: true } })
    : [];
  const firs: { id: string }[] = [];

  const created = await prisma.event.create({
    data: {
      title,
      description,
      puckLayout,
      slug,
      startTime,
      endTime,
      bannerUrl,
      isPublished,
      infoUrl,
      eventType,
      divisions,
      routes,
      hqeAward,
      externalId,
      airports: { connect: airports.map((a) => ({ id: a.id })) },
      firs: { connect: firs.map((f) => ({ id: f.id })) },
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "event",
    entityId: created.id,
    before: null,
    after: created,
  });

  await syncHeroSlideForEvent({
    locale,
    eventId: created.id,
    slug,
    title,
    startTime,
    bannerUrl,
    infoUrl,
    isPublished,
    airportIcaos,
  });

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/home`);
  return { success: true };
}

export async function updateEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await ensure_admin_events();
  const eventId = String(formData.get("eventId") ?? "");
  const {
    title,
    description,
    puckLayout,
    slugInput,
    startTime,
    endTime,
    bannerUrl,
    isPublished,
    airportIcaos,
    locale,
    infoUrl,
    eventType,
    divisions,
    routes,
    hqeAward,
    externalId,
  } = parseEventForm(formData);

  if (!eventId || !title || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Invalid event data", success: false };
  }

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) return { error: "Event not found", success: false };

  const slug = slugInput ? slugify(slugInput) : slugify(title);
  const finalDescription = description || existing.description || "";

  const airports = airportIcaos.length
    ? await prisma.airport.findMany({ where: { icao: { in: airportIcaos } }, select: { id: true } })
    : [];
  const firs: { id: string }[] = [];

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description: finalDescription,
      puckLayout,
      slug,
      startTime,
      endTime,
      bannerUrl,
      infoUrl,
      eventType,
      divisions,
      routes,
      hqeAward,
      externalId,
      isPublished,
      airports: { set: airports.map((a) => ({ id: a.id })) },
      firs: { set: firs.map((f) => ({ id: f.id })) },
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "event",
    entityId: eventId,
    before: existing,
    after: updated,
  });

  await syncHeroSlideForEvent({
    locale,
    eventId: eventId,
    slug,
    title,
    startTime,
    bannerUrl,
    infoUrl,
    isPublished,
    airportIcaos,
    previousSlug: existing.slug,
  });

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
  revalidatePath(`/${locale}/home`);
  return { success: true };
}

export async function deleteEvent(formData: FormData) {
  const session = await ensure_admin_events();
  const eventId = String(formData.get("eventId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!eventId) throw new Error("Invalid event id");
  const before = await prisma.event.findUnique({ where: { id: eventId } });
  await prisma.$transaction([
    prisma.eventRegistration.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { airports: { set: [] }, firs: { set: [] } } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "event",
    entityId: eventId,
    before,
    after: null,
  });

  if (before?.slug) {
    const slide = await prisma.heroSlide.findFirst({
      where: { locale, ctaHref: `/${locale}/events/${before.slug}` },
    });
    if (slide) {
      await prisma.heroSlide.delete({ where: { id: slide.id } });
    }
  }

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/home`);
}

export async function importIvaoEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await ensure_admin_events();
  const payloadRaw = String(formData.get("payload") ?? "{}");
  const locale = String(formData.get("locale") ?? "en");
  let parsed: Record<string, unknown> | null;
  try {
    const raw = JSON.parse(payloadRaw) as unknown;
    parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  } catch {
    return { error: "Invalid IVAO payload" };
  }
  if (!parsed) {
    return { error: "Invalid IVAO payload" };
  }

  const title = String(parsed?.title ?? "").trim();
  const description = typeof parsed?.description === "string" ? parsed.description : "";
  const infoUrl = typeof parsed?.infoUrl === "string" ? parsed.infoUrl : null;
  const parseDate = (value: unknown) => {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "string" || typeof value === "number") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };
  const startTime = parseDate(parsed?.startTime ?? parsed?.startDate);
  const endTime = parseDate(parsed?.endTime ?? parsed?.endDate);
  const bannerUrl =
    typeof parsed?.bannerUrl === "string"
      ? parsed.bannerUrl
      : typeof parsed?.imageUrl === "string"
        ? parsed.imageUrl
        : null;
  const eventType = typeof parsed?.eventType === "string" ? parsed.eventType : null;
  const hqeAward = Boolean(parsed?.hqeAward);
  const divisions =
    Array.isArray(parsed?.divisions) && parsed.divisions.length
      ? JSON.stringify(parsed.divisions.map((d: unknown) => String(d ?? "").toUpperCase()).filter(Boolean))
      : null;
  const routes =
    Array.isArray(parsed?.routes) && parsed.routes.length ? JSON.stringify(parsed.routes) : null;
  const airports = Array.isArray(parsed?.airports)
    ? (parsed.airports as unknown[])
        .map((a) => (typeof a === "string" ? a : (a as { icao?: string })?.icao))
        .filter(Boolean)
        .map((s) => (s as string).toUpperCase())
    : [];

  if (!title || !startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return { error: "Missing required IVAO event fields" };
  }

  const slug = slugify(title);
  const airportRecords = airports.length
    ? await prisma.airport.findMany({ where: { icao: { in: airports } }, select: { id: true } })
    : [];

  const existing = await prisma.event.findUnique({ where: { slug } });
  const upserted = await prisma.event.upsert({
    where: { slug },
    update: {
      title,
      description,
      infoUrl,
      startTime,
      endTime,
      bannerUrl,
      eventType,
      hqeAward,
      divisions,
      routes,
      externalId: parsed?.id ? String(parsed.id) : undefined,
      airports: { set: airportRecords.map((a) => ({ id: a.id })) },
    },
    create: {
      title,
      description,
      slug,
      infoUrl,
      startTime,
      endTime,
      bannerUrl,
      eventType,
      hqeAward,
      divisions,
      routes,
      externalId: parsed?.id ? String(parsed.id) : undefined,
      isPublished: false,
      airports: { connect: airportRecords.map((a) => ({ id: a.id })) },
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: existing ? "update" : "create",
    entityType: "event",
    entityId: upserted.id,
    before: existing,
    after: upserted,
  });

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
  revalidatePath(`/${locale}/home`);
  return { success: true };
}
