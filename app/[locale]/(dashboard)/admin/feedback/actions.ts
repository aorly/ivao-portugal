"use server";

import { revalidatePath } from "next/cache";
import { requireStaffPermission } from "@/lib/staff";
import { prisma } from "@/lib/prisma";

const ensureFeedback = async () => {
  const allowed = await requireStaffPermission("admin:feedback");
  if (!allowed) throw new Error("Unauthorized");
};

export async function deleteFeedback(formData: FormData) {
  await ensureFeedback();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  await prisma.feedbackSubmission.delete({ where: { id } });
  revalidatePath("/[locale]/admin/feedback");
}

export async function deleteAllFeedback() {
  await ensureFeedback();
  await prisma.feedbackSubmission.deleteMany();
  revalidatePath("/[locale]/admin/feedback");
}
