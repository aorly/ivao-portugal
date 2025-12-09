"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { type Locale } from "@/i18n";

export async function submitTrainingRequest(formData: FormData, locale: Locale) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const type = String(formData.get("type") ?? "").toUpperCase();
  if (!["PILOT", "ATC"].includes(type)) {
    throw new Error("Invalid training type");
  }
  const message = formData.get("message") ? String(formData.get("message")) : null;
  const availabilityRaw = String(formData.get("availability") ?? "");
  const availabilities = availabilityRaw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.trainingRequest.create({
    data: {
      userId: session.user.id,
      type,
      message,
      status: "pending",
      availabilities: JSON.stringify(availabilities),
    },
  });

  revalidatePath(`/${locale}/training`);
}
