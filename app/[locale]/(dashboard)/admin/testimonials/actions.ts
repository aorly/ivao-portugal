"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaffPermission } from "@/lib/staff";

const ensureTestimonials = async () => {
  const allowed = await requireStaffPermission("admin:testimonials");
  if (!allowed) throw new Error("Unauthorized");
};

export async function approveTestimonial(formData: FormData) {
  await ensureTestimonials();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  await prisma.testimonial.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  revalidatePath("/[locale]/admin/testimonials");
  revalidatePath("/[locale]/home");
}

export async function rejectTestimonial(formData: FormData) {
  await ensureTestimonials();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  await prisma.testimonial.update({
    where: { id },
    data: { status: "REJECTED", approvedAt: null },
  });
  revalidatePath("/[locale]/admin/testimonials");
}

export async function deleteTestimonial(formData: FormData) {
  await ensureTestimonials();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  await prisma.testimonial.delete({ where: { id } });
  revalidatePath("/[locale]/admin/testimonials");
  revalidatePath("/[locale]/home");
}
