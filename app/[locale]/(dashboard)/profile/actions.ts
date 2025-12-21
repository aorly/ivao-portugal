"use server";

import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";

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
