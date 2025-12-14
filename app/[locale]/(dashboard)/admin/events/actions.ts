"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

  const airportsRaw = String(formData.get("airports") ?? "");
  const airportIcaos = airportsRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos, locale };
}

type ActionState = { success?: boolean; error?: string };

export async function createEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos, locale } =
    parseEventForm(formData);

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
      airports: { connect: airports.map((a) => ({ id: a.id })) },
      firs: { connect: firs.map((f) => ({ id: f.id })) },
    },
  });

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
  return { success: true };
}

export async function updateEvent(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const eventId = String(formData.get("eventId") ?? "");
  const { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos, locale } =
    parseEventForm(formData);

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
