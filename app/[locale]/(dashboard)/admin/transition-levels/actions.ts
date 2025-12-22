"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { loadTlGroups, saveTlGroups, type TlGroup } from "@/lib/transition-level";
const ensure_admin_transition_levels = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:transition-levels");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

export async function saveTlJson(formData: FormData) {
  await ensure_admin_transition_levels();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) throw new Error("Missing JSON");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of groups");
  }
  // basic normalization
  const normalize = (g: any): TlGroup => ({
    taFt: Number(g.taFt ?? 0),
    icaos: Array.isArray(g.icaos) ? g.icaos.map((x: any) => String(x).toUpperCase()).filter(Boolean) : [],
    bands: Array.isArray(g.bands)
      ? g.bands
          .map((b: any) => ({
            min: b.min == null ? undefined : Number(b.min),
            max: b.max == null ? undefined : Number(b.max),
            tl: Number(b.tl),
          }))
          .filter((b) => Number.isFinite(b.tl))
      : [],
  });
  const normalized = (parsed as any[]).map(normalize);
  await saveTlGroups(normalized);
  revalidatePath("/[locale]/admin/transition-levels");
  revalidatePath("/[locale]/airports");
}
