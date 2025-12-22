"use server";

import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
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
  await ensure_admin_events();
  const {
    title,
    description,
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

  await prisma.event.create({
    data: {
      title,
      description,
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

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  return { success: true };
}

export async function updateEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  await ensure_admin_events();
  const eventId = String(formData.get("eventId") ?? "");
  const {
    title,
    description,
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

  const existing = await prisma.event.findUnique({ where: { id: eventId }, select: { description: true } });
  if (!existing) return { error: "Event not found", success: false };

  const slug = slugInput ? slugify(slugInput) : slugify(title);
  const finalDescription = description || existing.description || null;

  const airports = airportIcaos.length
    ? await prisma.airport.findMany({ where: { icao: { in: airportIcaos } }, select: { id: true } })
    : [];
  const firs: { id: string }[] = [];

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description: finalDescription,
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

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
  return { success: true };
}

export async function deleteEvent(formData: FormData) {
  await ensure_admin_events();
  const eventId = String(formData.get("eventId") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  if (!eventId) throw new Error("Invalid event id");
  await prisma.$transaction([
    prisma.eventRegistration.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { airports: { set: [] }, firs: { set: [] } } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
}

export async function importIvaoEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await ensure_admin_events();
  const payloadRaw = String(formData.get("payload") ?? "{}");
  const locale = String(formData.get("locale") ?? "en");
  let parsed: any;
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    return { error: "Invalid IVAO payload" };
  }

  const title = String(parsed?.title ?? "").trim();
  const description = typeof parsed?.description === "string" ? parsed.description : "";
  const infoUrl = typeof parsed?.infoUrl === "string" ? parsed.infoUrl : null;
  const startTime = parsed?.startTime
    ? new Date(parsed.startTime)
    : parsed?.startDate
      ? new Date(parsed.startDate)
      : null;
  const endTime = parsed?.endTime
    ? new Date(parsed.endTime)
    : parsed?.endDate
      ? new Date(parsed.endDate)
      : null;
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

  await prisma.event.upsert({
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

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
  return { success: true };
}
