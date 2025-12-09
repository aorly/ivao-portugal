"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

export async function createExam(formData: FormData, locale: Locale) {
  const title = String(formData.get("title") ?? "").trim();
  const description = formData.get("description") ? String(formData.get("description")) : null;
  const link = formData.get("link") ? String(formData.get("link")) : null;
  const dateTimeRaw = String(formData.get("dateTime") ?? "");
  const dateTime = new Date(dateTimeRaw);

  if (!title || Number.isNaN(dateTime.getTime())) {
    throw new Error("Invalid exam data");
  }

  await prisma.trainingExam.create({
    data: {
      title,
      description,
      link,
      dateTime,
    },
  });

  revalidatePath(`/${locale}/admin/exams`);
  revalidatePath(`/${locale}/training`);
}

export async function deleteExam(examId: string, locale: Locale) {
  await prisma.trainingExam.delete({ where: { id: examId } });
  revalidatePath(`/${locale}/admin/exams`);
  revalidatePath(`/${locale}/training`);
}
