"use server";

import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
const ensure_admin_exams = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:exams");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};


export async function createExam(formData: FormData, locale: Locale) {
  await ensure_admin_exams();
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
  await ensure_admin_exams();
  await prisma.trainingExam.delete({ where: { id: examId } });
  revalidatePath(`/${locale}/admin/exams`);
  revalidatePath(`/${locale}/training`);
}
