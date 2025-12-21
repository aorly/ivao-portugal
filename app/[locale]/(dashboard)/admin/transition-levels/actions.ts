"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTlGroups, saveTlGroups, type TlGroup } from "@/lib/transition-level";

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const role = dbUser?.role ?? session.user.role ?? "USER";
  if (role === "USER") throw new Error("Unauthorized");
  return session;
};

export async function saveTlJson(formData: FormData) {
  await ensureAdmin();
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
