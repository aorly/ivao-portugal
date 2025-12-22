"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { type Locale } from "@/i18n";
const ensure_admin_training = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:training");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};


export async function addSessionComment(formData: FormData, sessionId: string, locale: Locale) {
  const session = await ensure_admin_training();
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
  revalidatePath(`/${locale}/admin/training/${sessionId}`);
  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
}
