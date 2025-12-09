"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";

export async function updateTrainingRequestStatus(requestId: string, status: string, locale: Locale) {
  if (!requestId || !status) {
    throw new Error("Missing request id or status");
  }

  const allowed = ["pending", "scheduled", "completed", "rejected"];
  if (!allowed.includes(status)) throw new Error("Invalid status");

  await prisma.trainingRequest.update({
    where: { id: requestId },
    data: { status },
  });

  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
}

export async function assignTrainingRequest(requestId: string, trainerVid: string, locale: Locale) {
  if (!requestId || !trainerVid) throw new Error("Request and trainer VID are required");

  const trainer = await prisma.user.findUnique({ where: { vid: trainerVid }, select: { id: true } });
  if (!trainer) throw new Error("Trainer not found for provided VID");

  await prisma.trainingRequest.update({
    where: { id: requestId },
    data: { assignedTrainerId: trainer.id, assignedAt: new Date() },
  });

  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
}

export async function deleteTrainingRequest(requestId: string, locale: Locale) {
  if (!requestId) throw new Error("Request id required");
  await prisma.trainingRequest.delete({ where: { id: requestId } });
  revalidatePath(`/${locale}/admin/training`);
}

export async function createTrainingSession(formData: FormData, locale: Locale) {
  const userId = String(formData.get("userId") ?? "");
  const instructorId = formData.get("instructorId")
    ? String(formData.get("instructorId"))
    : null;
  const type = String(formData.get("type") ?? "").trim();
  const notes = formData.get("notes") ? String(formData.get("notes")) : null;
  const dateTimeRaw = String(formData.get("dateTime") ?? "");
  const dateTime = new Date(dateTimeRaw);

  if (!userId || !type || Number.isNaN(dateTime.getTime())) {
    throw new Error("Invalid training session data");
  }

  await prisma.trainingSession.create({
    data: {
      userId,
      instructorId,
      type,
      dateTime,
      notes,
    },
  });

  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
  revalidatePath(`/${locale}/profile`);
}

export async function addSessionComment(formData: FormData, sessionId: string, locale: Locale) {
  const session = await auth();
  const authorId = session?.user?.id ?? null;
  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    throw new Error("Comment cannot be empty");
  }
  await prisma.trainingSessionComment.create({
    data: {
      sessionId,
      body,
      authorId,
    },
  });
  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
  revalidatePath(`/${locale}/profile`);
}
