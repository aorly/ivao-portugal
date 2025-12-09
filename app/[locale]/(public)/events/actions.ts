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
