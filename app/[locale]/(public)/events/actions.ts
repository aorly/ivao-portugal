"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { type Locale } from "@/i18n";

export async function registerForEvent(eventId: string, slug: string, locale: Locale) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.eventRegistration.upsert({
    where: {
      userId_eventId: {
        userId: session.user.id,
        eventId,
      },
    },
    update: {},
    create: {
      userId: session.user.id,
      eventId,
    },
  });

  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
}

export async function unregisterFromEvent(eventId: string, slug: string, locale: Locale) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.eventRegistration.deleteMany({
    where: { userId: session.user.id, eventId },
  });

  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
}

export async function updateEventContent(eventId: string, slug: string, locale: Locale, formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role === "USER") {
    throw new Error("Unauthorized");
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
  const startRaw = formData.get("startTime") as string | null;
  const endRaw = formData.get("endTime") as string | null;
  const startTime = startRaw ? new Date(startRaw) : null;
  const endTime = endRaw ? new Date(endRaw) : null;

  if (!title) throw new Error("Title is required");
  if (!startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error("Valid start and end times are required");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title,
      description,
      startTime,
      endTime,
      bannerUrl,
    },
  });

  revalidatePath(`/${locale}/events`);
  revalidatePath(`/${locale}/events/${slug}`);
}
