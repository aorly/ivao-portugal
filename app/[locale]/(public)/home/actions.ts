"use server";

import { auth } from "@/lib/auth";
import { ivaoClient } from "@/lib/ivaoClient";

export async function createAtcBookingAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.ivaoAccessToken) {
    return { error: "Not authenticated with IVAO", success: false };
  }

  const station = String(formData.get("station") ?? "").trim().toUpperCase();
  const start = String(formData.get("start") ?? "").trim();
  const end = String(formData.get("end") ?? "").trim();
  const training = ["true", "on", "1"].includes(String(formData.get("training") ?? "").toLowerCase());
  const exam = ["true", "on", "1"].includes(String(formData.get("exam") ?? "").toLowerCase());

  if (!station || !start || !end) {
    return { error: "Station, start, and end are required.", success: false };
  }

  const trainingFlag = training ? "training" : exam ? "exam" : null;
  const payload = {
    atcPosition: station,
    startDate: start,
    endDate: end,
    training: trainingFlag,
    voice: true,
  };

  try {
    await ivaoClient.createAtcBooking(payload, session.user.ivaoAccessToken);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Booking failed", success: false };
  }
}
