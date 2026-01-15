"use server";

import { syncCalendarIfStale } from "@/lib/calendar-sync";
import { requireStaffPermission } from "@/lib/staff";
import { revalidatePath } from "next/cache";

export async function syncCalendarNow(locale: string) {
  const allowed = await requireStaffPermission("admin:events");
  if (!allowed) throw new Error("Unauthorized");

  const result = await syncCalendarIfStale({ force: true });
  revalidatePath(`/${locale}/admin/calendar`);
  return result;
}
