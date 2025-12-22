"use server";

import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteAtcBookingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.ivaoAccessToken) {
    return { error: "Not authenticated with IVAO", success: false };
  }
  const bookingId = String(formData.get("bookingId") ?? "").trim();
  if (!bookingId) return { error: "Missing booking id", success: false };

  try {
    await ivaoClient.deleteAtcBooking(bookingId, session.user.ivaoAccessToken);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Delete failed", success: false };
  }
}

export async function updateStaffProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", success: false };
  }

  const staffPhotoUrl = String(formData.get("staffPhotoUrl") ?? "").trim() || null;
  const staffBio = String(formData.get("staffBio") ?? "").trim() || null;
  const publicStaffProfile = formData.get("publicStaffProfile") === "on";
  const locale = String(formData.get("locale") ?? "en");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { staffPhotoUrl, staffBio, publicStaffProfile },
  });

  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/staff`);

  return { success: true };
}
