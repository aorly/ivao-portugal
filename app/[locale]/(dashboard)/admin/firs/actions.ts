"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { logAudit } from "@/lib/audit";
const ensure_admin_firs = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:firs");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};


export async function createFir(formData: FormData) {
  const session = await ensure_admin_firs();

  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const boundaries = String(formData.get("boundaries") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!slug || !name || !boundaries) {
    throw new Error("Slug, name, and boundaries are required.");
  }

  const created = await prisma.fir.create({
    data: { slug, name, boundaries, description },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "fir",
    entityId: created.id,
    before: null,
    after: created,
  });

  revalidatePath("/[locale]/admin/firs");
}

export async function updateFir(formData: FormData) {
  const session = await ensure_admin_firs();
  const firId = String(formData.get("firId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const boundaries = String(formData.get("boundaries") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!firId || !slug || !name || !boundaries) {
    throw new Error("FIR id, slug, name, and boundaries are required.");
  }
  const before = await prisma.fir.findUnique({ where: { id: firId } });
  const updated = await prisma.fir.update({
    where: { id: firId },
    data: { slug, name, boundaries, description },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "fir",
    entityId: firId,
    before,
    after: updated,
  });
  revalidatePath("/[locale]/admin/firs");
}

export async function deleteFir(formData: FormData) {
  const session = await ensure_admin_firs();
  const firId = String(formData.get("firId") ?? "").trim();
  if (!firId) throw new Error("Missing FIR id");
  const before = await prisma.fir.findUnique({ where: { id: firId } });
  await prisma.fir.delete({ where: { id: firId } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "fir",
    entityId: firId,
    before,
    after: null,
  });
  revalidatePath("/[locale]/admin/firs");
}

export async function updateFirAirports(formData: FormData) {
  const session = await ensure_admin_firs();

  const firId = String(formData.get("firId") ?? "").trim();
  const airportIds = formData.getAll("airportIds").map((id) => String(id));
  if (!firId) throw new Error("Missing FIR id");

  const before = await prisma.fir.findUnique({ where: { id: firId }, include: { airports: true } });
  const updated = await prisma.fir.update({
    where: { id: firId },
    data: {
      airports: {
        set: [],
        connect: airportIds.map((id) => ({ id })),
      },
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update-airports",
    entityType: "fir",
    entityId: firId,
    before,
    after: updated,
  });

  revalidatePath("/[locale]/admin/firs");
}

export async function importFrequencies(formData: FormData) {
  const session = await ensure_admin_firs();

  const firId = String(formData.get("firId") ?? "").trim() || null;
  const file = formData.get("freqFile") as File | null;
  if (!file) throw new Error("Missing frequency file");
  const text = await file.text();

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("#") && !l.startsWith(";"));

  const parsed = lines
    .map((line) => {
      // Accept delimited formats like "LPPC_CTR;132.950;Lisboa Control" or space-separated.
      const parts = line.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
      const freqMatch = line.match(/([0-9]{3}\.[0-9]{1,3})/);
      if (!freqMatch) return null;
      const frequency = freqMatch[1];
      const station = (parts[0] ?? line.split(/\s+/)[0] ?? "").toUpperCase();
      if (!station) return null;
      // Name: prefer third part, else everything after freq.
      const nameFromParts = parts.length >= 3 ? parts.slice(2).join(" ") : null;
      const nameFromTail = line.replace(freqMatch[0], "").replace(station, "").trim();
      const name = nameFromParts?.trim() || nameFromTail || null;

      return { station, frequency, name: name || null };
    })
    .filter(Boolean) as { station: string; frequency: string; name: string | null }[];

  if (parsed.length === 0) throw new Error("No frequencies parsed");

  await prisma.$transaction([
    prisma.atcFrequency.deleteMany({ where: { firId: firId ?? undefined, station: { in: parsed.map((p) => p.station) } } }),
    prisma.atcFrequency.createMany({
      data: parsed.map((p) => ({
        station: p.station,
        frequency: p.frequency,
        name: p.name,
        firId: firId ?? undefined,
      })),
    }),
  ]);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "import-frequencies",
    entityType: "fir",
    entityId: firId,
    before: null,
    after: { count: parsed.length },
  });

  revalidatePath("/[locale]/admin/firs");
}
