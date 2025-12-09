"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function parseEventForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const startTime = new Date(String(formData.get("startTime") ?? ""));
  const endTime = new Date(String(formData.get("endTime") ?? ""));
  const bannerUrl = formData.get("bannerUrl") ? String(formData.get("bannerUrl")) : null;
  const isPublished = formData.get("isPublished") === "on";

  const airportsRaw = String(formData.get("airports") ?? "");
  const airportIcaos = airportsRaw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos };
}

export async function createEvent(formData: FormData, locale: Locale) {
  const { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos } =
    parseEventForm(formData);

  if (!title || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error("Invalid event data");
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
}

export async function updateEvent(eventId: string, formData: FormData, locale: Locale) {
  const { title, description, slugInput, startTime, endTime, bannerUrl, isPublished, airportIcaos } =
    parseEventForm(formData);

  if (!title || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error("Invalid event data");
  }

  const slug = slugInput ? slugify(slugInput) : slugify(title);

  const airports = airportIcaos.length
    ? await prisma.airport.findMany({ where: { icao: { in: airportIcaos } }, select: { id: true } })
    : [];
  const firs: { id: string }[] = [];

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description,
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
}

export async function deleteEvent(eventId: string, locale: Locale) {
  await prisma.$transaction([
    prisma.eventRegistration.deleteMany({ where: { eventId } }),
    prisma.event.update({ where: { id: eventId }, data: { airports: { set: [] }, firs: { set: [] } } }),
    prisma.event.delete({ where: { id: eventId } }),
  ]);

  revalidatePath(`/${locale}/admin/events`);
  revalidatePath(`/${locale}/events`);
}
