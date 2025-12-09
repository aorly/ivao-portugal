"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { type Locale } from "@/i18n";

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
  revalidatePath(`/${locale}/admin/training/${sessionId}`);
  revalidatePath(`/${locale}/admin/training`);
  revalidatePath(`/${locale}/training`);
}
