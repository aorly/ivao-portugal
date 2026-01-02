"use server";

import fs from "node:fs/promises";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { RESOURCE_DIR, recordResource } from "@/lib/significant-points";
import { logAudit } from "@/lib/audit";
const ensure_admin_significant_points = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:significant-points");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};


export async function uploadSignificantResource(formData: FormData) {
  const session = await ensure_admin_significant_points();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing file");
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("Only .zip files are allowed");
  }

  const description = String(formData.get("description") ?? "").trim();

  await fs.mkdir(RESOURCE_DIR, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const stampedName = `${Date.now()}-${safeName}`;
  const destination = path.join(RESOURCE_DIR, stampedName);
  await fs.writeFile(destination, buffer);
  await recordResource(stampedName, description);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "upload",
    entityType: "significantPointResource",
    entityId: stampedName,
    before: null,
    after: { description },
  });

  revalidatePath("/[locale]/admin/significant-points");
  revalidatePath("/[locale]/significant-points");
  return { ok: true };
}

export async function saveSignificantCsv(formData: FormData) {
  const session = await ensure_admin_significant_points();

  const raw = String(formData.get("csv") ?? "").trim();
  if (!raw) throw new Error("Missing CSV content");
  await fs.writeFile(path.join(process.cwd(), "data", "significant-points.csv"), raw, "utf-8");
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "replace",
    entityType: "significantPoints",
    entityId: null,
    before: null,
    after: { length: raw.length },
  });
  revalidatePath("/[locale]/significant-points");
  revalidatePath("/[locale]/admin/significant-points");
  return { ok: true };
}
