"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const role = user?.role ?? session.user.role ?? "USER";
  if (role === "USER") throw new Error("Unauthorized");
  return session;
};

export async function createFrequency(formData: FormData) {
  await ensureAdmin();
  const station = String(formData.get("station") ?? "").trim().toUpperCase();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const firId = String(formData.get("firId") ?? "").trim() || null;
  const airportIds = formData
    .getAll("airportIds")
    .map((a) => String(a).trim())
    .filter(Boolean);
  const lower = String(formData.get("lower") ?? "").trim() || null;
  const upper = String(formData.get("upper") ?? "").trim() || null;
  const restricted = ["true", "on", "1"].includes(String(formData.get("restricted") ?? "").toLowerCase());

  if (!station || !frequency) throw new Error("Station and frequency are required.");

  const targets = airportIds.length ? airportIds : [null];

  await prisma.$transaction(
    targets.map((airportId) =>
      prisma.atcFrequency.create({
        data: {
          station,
          frequency,
          name,
          lower,
          upper,
          restricted,
          firId: firId || undefined,
          airportId: airportId || undefined,
        },
      }),
    ),
  );

  revalidatePath("/[locale]/admin/frequencies");
}

export async function updateFrequency(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const station = String(formData.get("station") ?? "").trim().toUpperCase();
  const frequency = String(formData.get("frequency") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || null;
  const firId = String(formData.get("firId") ?? "").trim() || null;
  const airportIds = formData
    .getAll("airportIds")
    .map((a) => String(a).trim())
    .filter(Boolean);
  const lower = String(formData.get("lower") ?? "").trim() || null;
  const upper = String(formData.get("upper") ?? "").trim() || null;
  const restricted = ["true", "on", "1"].includes(String(formData.get("restricted") ?? "").toLowerCase());

  if (!id || !station || !frequency) throw new Error("Id, station, and frequency are required.");

  const existing = await prisma.atcFrequency.findUnique({ where: { id } });
  if (!existing) throw new Error("Frequency not found");

  // Delete all frequencies in the same group (station+frequency+fir) to reinsert the new set
  const existingGroup = await prisma.atcFrequency.findMany({
    where: {
      station: existing.station,
      frequency: existing.frequency,
      firId: existing.firId ?? null,
    },
    select: { id: true },
  });
  const existingIds = existingGroup.map((f) => f.id);

  // Remove boundaries referencing these frequencies to avoid FK errors
  if (existingIds.length) {
    // Delete points first, then boundaries
    await prisma.frequencyBoundaryPoint.deleteMany({
      where: { boundary: { atcFrequencyId: { in: existingIds } } },
    });
    await prisma.frequencyBoundary.deleteMany({ where: { atcFrequencyId: { in: existingIds } } });
    await prisma.atcFrequency.deleteMany({ where: { id: { in: existingIds } } });
  }

  const targets = airportIds.length ? airportIds : [null];

  await prisma.$transaction(
    targets.map((airportId) =>
      prisma.atcFrequency.create({
        data: {
          station,
          frequency,
          name,
          lower,
          upper,
          restricted,
          firId: firId || undefined,
          airportId: airportId || undefined,
        },
      }),
    ),
  );

  revalidatePath("/[locale]/admin/frequencies");
}

export async function deleteFrequency(formData: FormData) {
  await ensureAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing id");
  await prisma.atcFrequency.delete({ where: { id } });
  revalidatePath("/[locale]/admin/frequencies");
}
