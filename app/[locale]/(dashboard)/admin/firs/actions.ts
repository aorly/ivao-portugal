"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { logAudit } from "@/lib/audit";
import { ivaoClient } from "@/lib/ivaoClient";
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

  const directParsed = lines
    .map((line) => {
      // Accept delimited formats like "LPPC_CTR;132.950;Lisboa Control" or space-separated.
      const parts = line.split(/[;,]/).map((p) => p.trim()).filter(Boolean);
      const freqMatch = line.match(/([0-9]{3}[.,][0-9]{1,3})/);
      if (!freqMatch) return null;
      const frequency = freqMatch[1].replace(",", ".");
      const station = (parts[0] ?? line.split(/\s+/)[0] ?? "").toUpperCase();
      if (!station) return null;
      // Name: prefer third part, else everything after freq.
      const nameFromParts = parts.length >= 3 ? parts.slice(2).join(" ") : null;
      const nameFromTail = line.replace(freqMatch[0], "").replace(station, "").trim();
      const name = nameFromParts?.trim() || nameFromTail || null;

      return { station, frequency, name: name || null };
    })
    .filter(Boolean) as { station: string; frequency: string; name: string | null }[];

  const kvParsed: { station: string; frequency: string; name: string | null }[] = [];
  let current: { station?: string; frequency?: string; name?: string } = {};
  const flush = () => {
    if (current.station && current.frequency) {
      kvParsed.push({
        station: current.station,
        frequency: current.frequency,
        name: current.name ?? null,
      });
    }
    current = {};
  };

  for (const line of lines) {
    if (line.startsWith("[") && line.endsWith("]")) {
      flush();
      continue;
    }
    const stationMatch = line.match(/^(callsign|station)\s*[:=]\s*(.+)$/i);
    if (stationMatch) {
      if (current.station && current.frequency) flush();
      current.station = stationMatch[2].trim().toUpperCase();
      continue;
    }
    const freqMatch = line.match(/^(freq|frequency)\s*[:=]\s*([0-9]{3}[.,][0-9]{1,3})/i);
    if (freqMatch) {
      current.frequency = freqMatch[2].replace(",", ".");
      continue;
    }
    const nameMatch = line.match(/^(name|position)\s*[:=]\s*(.+)$/i);
    if (nameMatch) {
      current.name = nameMatch[2].trim();
    }
  }
  flush();

  const parsedMap = new Map<string, { station: string; frequency: string; name: string | null }>();
  for (const entry of [...directParsed, ...kvParsed]) {
    const key = `${entry.station}|${entry.frequency}`;
    if (!parsedMap.has(key)) {
      parsedMap.set(key, entry);
    }
  }
  const parsed = Array.from(parsedMap.values());

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

type SyncFirState = { success?: boolean; error?: string; changes?: string[]; syncedAt?: string };
type SyncAllFirsState = { success?: boolean; error?: string; updated?: number; failed?: number; details?: string[] };
type SyncFirResult = { slug: string; changes: string[]; syncedAt?: string };

const asArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (value && typeof value === "object") {
    const obj = value as { data?: unknown; result?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    if (Array.isArray(obj.result)) return obj.result as Record<string, unknown>[];
    if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
  }
  return [];
};

const normalizeFrequency = (value: unknown) => {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(3);
  const text = String(value).trim();
  if (!text) return null;
  const num = Number(text);
  if (!Number.isNaN(num) && Number.isFinite(num)) return num.toFixed(3);
  return text;
};

const clearFirFrequencies = async (firId: string) => {
  const freqIds = await prisma.atcFrequency.findMany({
    where: { firId },
    select: { id: true },
  });
  if (!freqIds.length) return;
  const ids = freqIds.map((f) => f.id);
  const boundaryIds = await prisma.frequencyBoundary.findMany({
    where: { atcFrequencyId: { in: ids } },
    select: { id: true },
  });
  if (boundaryIds.length) {
    const bIds = boundaryIds.map((b) => b.id);
    await prisma.frequencyBoundaryPoint.deleteMany({ where: { boundaryId: { in: bIds } } });
    await prisma.frequencyBoundary.deleteMany({ where: { id: { in: bIds } } });
  }
  await prisma.atcFrequency.deleteMany({ where: { id: { in: ids } } });
};

export async function syncFirIvao(
  _prevState: SyncFirState,
  formData: FormData,
): Promise<SyncFirState> {
  const session = await ensure_admin_firs();
  const firId = String(formData.get("firId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  if (!firId || !locale) return { success: false, error: "Missing FIR id or locale." };

  try {
    const result = await syncFirIvaoById(firId, session?.user?.id ?? null);
    revalidatePath("/[locale]/admin/firs");
    revalidatePath(`/${locale}/airspace`);
    return {
      success: true,
      changes: result.changes.length ? result.changes : ["No changes detected."],
      syncedAt: result.syncedAt,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sync failed." };
  }
}

export async function syncFirIvaoById(firId: string, actorId: string | null): Promise<SyncFirResult> {
  const fir = await prisma.fir.findUnique({ where: { id: firId } });
  if (!fir) throw new Error("FIR not found.");

  const subcentersRaw = await ivaoClient.getCenterSubcenters(fir.slug);
  const subcenters = asArray(subcentersRaw);
  if (!subcenters.length) throw new Error("No IVAO subcenters returned.");

  const slugUpper = fir.slug.toUpperCase();
  const preferred =
    subcenters.find((s) => String(s.composePosition ?? "").toUpperCase() === `${slugUpper}_CTR`) ??
    subcenters.find((s) => s.middleIdentifier == null && String(s.position ?? "").toUpperCase() === "CTR") ??
    subcenters[0];

  const subcenterId = preferred?.id;
  const subcenterDetail = subcenterId != null ? await ivaoClient.getSubcenter(String(subcenterId)) : null;
  const detailObj = subcenterDetail && typeof subcenterDetail === "object" ? subcenterDetail : null;
  const regionPolygon = detailObj && "regionMapPolygon" in detailObj ? (detailObj as { regionMapPolygon?: unknown }).regionMapPolygon : null;
  const regionMap = detailObj && "regionMap" in detailObj ? (detailObj as { regionMap?: unknown }).regionMap : null;
  const boundariesSource = Array.isArray(regionPolygon) ? regionPolygon : Array.isArray(regionMap) ? regionMap : null;
  if (!boundariesSource) throw new Error("No IVAO boundaries returned.");
  const boundaries = JSON.stringify(boundariesSource);

  const positions = subcenters
    .map((pos) => {
      const station =
        typeof pos.composePosition === "string"
          ? pos.composePosition.trim().toUpperCase()
          : typeof pos.atcCallsign === "string"
            ? pos.atcCallsign.trim()
            : "";
      if (!station) return null;
      const name =
        typeof pos.atcCallsign === "string" && pos.atcCallsign.trim()
          ? pos.atcCallsign.trim()
          : null;
      const frequency = normalizeFrequency(pos.frequency);
      return frequency ? { station, name, frequency } : null;
    })
    .filter(Boolean) as { station: string; name: string | null; frequency: string }[];

  const changes: string[] = [];
  if (fir.boundaries !== boundaries) changes.push("Boundaries updated");
  const existingFreqCount = await prisma.atcFrequency.count({ where: { firId } });
  if (existingFreqCount !== positions.length) {
    changes.push(`CTR positions: ${existingFreqCount} -> ${positions.length}`);
  }

  const updated = await prisma.fir.update({
    where: { id: firId },
    data: {
      boundaries,
      ivaoSyncedAt: new Date(),
    },
  });

  await clearFirFrequencies(firId);
  if (positions.length) {
    await prisma.atcFrequency.createMany({
      data: positions.map((pos) => ({
        station: pos.station,
        name: pos.name,
        frequency: pos.frequency,
        firId,
      })),
    });
  }

  if (actorId) {
    await logAudit({
      actorId,
      action: "sync-ivao",
      entityType: "fir",
      entityId: firId,
      before: fir,
      after: updated,
    });
  }

  return {
    slug: fir.slug,
    changes: changes.length ? changes : ["No changes detected."],
    syncedAt: updated.ivaoSyncedAt?.toISOString(),
  };
}

export async function syncAllFirsIvao(
  _prevState: SyncAllFirsState,
  formData: FormData,
): Promise<SyncAllFirsState> {
  await ensure_admin_firs();
  const locale = String(formData.get("locale") ?? "").trim();
  if (!locale) return { success: false, error: "Missing locale." };

  const firs = await prisma.fir.findMany({ select: { id: true, slug: true, boundaries: true } });
  const details: string[] = [];
  let updated = 0;
  let failed = 0;

  for (const fir of firs) {
    const subcentersRaw = await ivaoClient.getCenterSubcenters(fir.slug);
    const subcenters = asArray(subcentersRaw);
    if (!subcenters.length) {
      failed += 1;
      details.push(`${fir.slug}: no IVAO subcenters`);
      continue;
    }

    const slugUpper = fir.slug.toUpperCase();
    const preferred =
      subcenters.find((s) => String(s.composePosition ?? "").toUpperCase() === `${slugUpper}_CTR`) ??
      subcenters.find((s) => s.middleIdentifier == null && String(s.position ?? "").toUpperCase() === "CTR") ??
      subcenters[0];

    const subcenterId = preferred?.id;
    const subcenterDetail = subcenterId != null ? await ivaoClient.getSubcenter(String(subcenterId)) : null;
    const detailObj = subcenterDetail && typeof subcenterDetail === "object" ? subcenterDetail : null;
    const regionPolygon = detailObj && "regionMapPolygon" in detailObj ? (detailObj as { regionMapPolygon?: unknown }).regionMapPolygon : null;
    const regionMap = detailObj && "regionMap" in detailObj ? (detailObj as { regionMap?: unknown }).regionMap : null;
    const boundariesSource = Array.isArray(regionPolygon) ? regionPolygon : Array.isArray(regionMap) ? regionMap : null;
    if (!boundariesSource) {
      failed += 1;
      details.push(`${fir.slug}: boundaries unavailable`);
      continue;
    }

    const boundaries = JSON.stringify(boundariesSource);
    const positions = subcenters
      .map((pos) => {
        const station =
          typeof pos.composePosition === "string"
            ? pos.composePosition.trim().toUpperCase()
            : typeof pos.atcCallsign === "string"
              ? pos.atcCallsign.trim()
              : "";
        if (!station) return null;
        const name =
          typeof pos.atcCallsign === "string" && pos.atcCallsign.trim()
            ? pos.atcCallsign.trim()
            : null;
        const frequency = normalizeFrequency(pos.frequency);
        return frequency ? { station, name, frequency } : null;
      })
      .filter(Boolean) as { station: string; name: string | null; frequency: string }[];

    const changes: string[] = [];
    if (fir.boundaries !== boundaries) changes.push("boundaries");
    const existingFreqCount = await prisma.atcFrequency.count({ where: { firId: fir.id } });
    if (existingFreqCount !== positions.length) changes.push(`ctr ${existingFreqCount} -> ${positions.length}`);

    await prisma.fir.update({
      where: { id: fir.id },
      data: {
        boundaries,
        ivaoSyncedAt: new Date(),
      },
    });

    await clearFirFrequencies(fir.id);
    if (positions.length) {
      await prisma.atcFrequency.createMany({
        data: positions.map((pos) => ({
          station: pos.station,
          name: pos.name,
          frequency: pos.frequency,
          firId: fir.id,
        })),
      });
    }

    if (changes.length) {
      updated += 1;
      details.push(`${fir.slug}: ${changes.join(", ")}`);
    }
  }

  revalidatePath("/[locale]/admin/firs");
  revalidatePath(`/${locale}/airspace`);

  return {
    success: true,
    updated,
    failed,
    details: details.length ? details : ["No changes detected."],
  };
}
