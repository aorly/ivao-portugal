"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const ensureAdmin = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  const role = user?.role ?? session.user.role ?? "USER";
  if (role === "USER") throw new Error("Unauthorized");
  return session;
};

const parseCoord = (coord: string | number | null | undefined) => {
  if (coord == null) return null;
  if (typeof coord === "number") return Number.isFinite(coord) ? coord : null;
  const raw = coord.toString().trim();
  if (!raw) return null;

  // Match formats like N038.45.59.210 or N384559.21 or N3845.59
  const dmsDot = raw.match(/^([NSWE])(\d{2,3})\.(\d{2})\.(\d{2}(?:\.\d+)?)$/i);
  if (dmsDot) {
    const [, hemi, deg, min, sec] = dmsDot;
    const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
    return ["S", "W"].includes(hemi.toUpperCase()) ? -decimal : decimal;
  }
  const dmsCompact = raw.match(/^([NSWE])(\d{2,3})(\d{2})(\d{2}(?:\.\d+)?)$/i);
  if (dmsCompact) {
    const [, hemi, deg, min, sec] = dmsCompact;
    const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
    return ["S", "W"].includes(hemi.toUpperCase()) ? -decimal : decimal;
  }

  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

type NavAidType = "FIX" | "VOR" | "NDB";

function parseNavAidFile(text: string, kind: NavAidType) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: any[] = [];
  for (const line of lines) {
    const parts = line.replace(/;+$/, "").split(";").map((p) => p.trim());
    if (kind === "FIX") {
      const ident = parts[0];
      // Try to locate two coordinate-like tokens in the row
      const coordTokens = parts
        .slice(1)
        .map((p) => ({ raw: p, val: parseCoord(p) }))
        .filter((c) => c.val !== null);
      const lat = coordTokens[0]?.val ?? parseCoord(parts[parts.length - 2]);
      const lon = coordTokens[1]?.val ?? parseCoord(parts[parts.length - 1]);
      if (!ident || lat == null || Number.isNaN(lat) || lon == null || Number.isNaN(lon)) continue;
      entries.push({ ident: ident.toUpperCase(), lat, lon });
    } else if (kind === "VOR") {
      // Expect: IDENT ; FREQ ; LAT ; LON ; [ELEV]
      const ident = parts[0];
      const freq = parts[1] ?? "";
      const latStr = parts[2];
      const lonStr = parts[3];
      const elevStr = parts[4];
      const lat = parseCoord(latStr);
      const lon = parseCoord(lonStr);
      const elevationFt = elevStr && !Number.isNaN(Number(elevStr)) ? Number(elevStr) : null;
      if (!ident || lat == null || Number.isNaN(lat) || lon == null || Number.isNaN(lon)) continue;
      entries.push({ ident: ident.toUpperCase(), freq, lat, lon, elevationFt });
    } else if (kind === "NDB") {
      // Expect: IDENT ; FREQ ; LAT ; LON
      const ident = parts[0];
      const freq = parts[1] ?? "";
      const latStr = parts[2];
      const lonStr = parts[3];
      const lat = parseCoord(latStr);
      const lon = parseCoord(lonStr);
      if (!ident || lat == null || Number.isNaN(lat) || lon == null || Number.isNaN(lon)) continue;
      entries.push({ ident: ident.toUpperCase(), freq, lat, lon });
    }
  }
  return entries;
}

async function previewNavAids(kind: NavAidType, firId: string, parsed: any[]) {
  if (!firId) throw new Error("FIR is required");
  if (parsed.length === 0) throw new Error("No entries parsed from file");

  if (kind === "FIX") {
    const existing = await prisma.fix.findMany({ where: { firId }, select: { id: true, name: true } });
    const existingNames = new Set(existing.map((f) => f.name.toUpperCase()));
    const newNames = new Set(parsed.map((p) => p.ident.toUpperCase()));
    const toDelete = existing.filter((e) => !newNames.has(e.name.toUpperCase()));
    const toAdd = parsed.filter((p) => !existingNames.has(p.ident.toUpperCase()));
    return { toDelete, toAdd };
  }
  if (kind === "VOR") {
    const existing = await prisma.vor.findMany({ where: { firId }, select: { id: true, ident: true } });
    const existingIds = new Set(existing.map((f) => f.ident.toUpperCase()));
    const newIds = new Set(parsed.map((p) => p.ident.toUpperCase()));
    const toDelete = existing.filter((e) => !newIds.has(e.ident.toUpperCase()));
    const toAdd = parsed.filter((p) => !existingIds.has(p.ident.toUpperCase()));
    return { toDelete, toAdd };
  }
  const existing = await prisma.ndb.findMany({ where: { firId }, select: { id: true, ident: true } });
  const existingIds = new Set(existing.map((f) => f.ident.toUpperCase()));
  const newIds = new Set(parsed.map((p) => p.ident.toUpperCase()));
  const toDelete = existing.filter((e) => !newIds.has(e.ident.toUpperCase()));
  const toAdd = parsed.filter((p) => !existingIds.has(p.ident.toUpperCase()));
  return { toDelete, toAdd };
}

async function applyNavAids(kind: NavAidType, firId: string, parsed: any[]) {
  if (kind === "FIX") {
    await prisma.$transaction([
      prisma.fix.deleteMany({ where: { firId } }),
      prisma.fix.createMany({
        data: parsed.map((p) => ({
          name: p.ident.toUpperCase(),
          latitude: p.lat,
          longitude: p.lon,
          firId,
        })),
      }),
    ]);
  } else if (kind === "VOR") {
    await prisma.$transaction([
      prisma.vor.deleteMany({ where: { firId } }),
      prisma.vor.createMany({
        data: parsed.map((p) => ({
          ident: p.ident.toUpperCase(),
          name: p.ident.toUpperCase(),
          frequency: p.freq ?? "",
          latitude: p.lat,
          longitude: p.lon,
          elevationFt: p.elevationFt ?? null,
          firId,
        })),
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.ndb.deleteMany({ where: { firId } }),
      prisma.ndb.createMany({
        data: parsed.map((p) => ({
          ident: p.ident.toUpperCase(),
          name: p.ident.toUpperCase(),
          frequency: p.freq ?? "",
          latitude: p.lat,
          longitude: p.lon,
          firId,
        })),
      }),
    ]);
  }
}

async function importNavAids(formData: FormData, kind: NavAidType) {
  await ensureAdmin();
  const firId = String(formData.get("firId") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").toLowerCase() === "true";
  const file = formData.get("file") as File | Blob | null;
  if (!file) throw new Error("Missing file");
  const text = await file.text();
  const parsedRaw = parseNavAidFile(text, kind);
  const parsed = Array.from(
    new Map(parsedRaw.map((p: any) => [String(p.ident ?? p.name ?? "").toUpperCase(), p])).values(),
  );
  const preview = await previewNavAids(kind, firId, parsed);
  if (!confirm) return { preview };
  await applyNavAids(kind, firId, parsed);
  revalidatePath("/[locale]/admin/airac");
  return { preview, applied: true };
}

export async function importFixes(formData: FormData) {
  return importNavAids(formData, "FIX");
}

export async function importVors(formData: FormData) {
  return importNavAids(formData, "VOR");
}

export async function importNdbs(formData: FormData) {
  return importNavAids(formData, "NDB");
}

export async function importFrequencyBoundaries(formData: FormData) {
  await ensureAdmin();
  const file = formData.get("file") as File | Blob | null;
  if (!file) throw new Error("Missing file");
  const text = await file.text();
  const confirm = String(formData.get("confirm") ?? "").toLowerCase() === "true";

  // Preload nav aids and freqs for lookup
  const [fixes, vors, ndbs, freqs] = await Promise.all([
    prisma.fix.findMany({ select: { id: true, name: true, latitude: true, longitude: true } }),
    prisma.vor.findMany({ select: { id: true, ident: true, latitude: true, longitude: true } }),
    prisma.ndb.findMany({ select: { id: true, ident: true, latitude: true, longitude: true } }),
    prisma.atcFrequency.findMany({ select: { id: true, station: true } }),
  ]);
  const freqByStation = new Map(freqs.map((f) => [f.station.toUpperCase(), f.id]));
  const fixMap = new Map(fixes.map((f) => [f.name.toUpperCase(), f]));
  const vorMap = new Map(vors.map((v) => [v.ident.toUpperCase(), v]));
  const ndbMap = new Map(ndbs.map((n) => [n.ident.toUpperCase(), n]));

  type Point = { lat: number; lon: number; fixId?: string; vorId?: string; ndbId?: string };
  type Region = { station: string; points: Point[] };
  const regions: Region[] = [];
  let current: Region | null = null;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(";").filter((p) => p.length > 0);
    if (parts.length >= 2 && parts[1].startsWith("#")) {
      if (current && current.points.length) regions.push(current);
      current = { station: parts[0].toUpperCase(), points: [] };
      continue;
    }
    if (!current) continue;
    const coordTokens = parts.map((p) => ({ raw: p, val: parseCoord(p) })).filter((c) => c.val !== null);
    if (coordTokens.length >= 2) {
      current.points.push({ lat: coordTokens[0].val as number, lon: coordTokens[1].val as number });
      continue;
    }
    // Try nav aid by name/ident
    const name = parts[0]?.toUpperCase();
    if (name && (fixMap.has(name) || vorMap.has(name) || ndbMap.has(name))) {
      const fix = fixMap.get(name);
      const vor = vorMap.get(name);
      const ndb = ndbMap.get(name);
      current.points.push({
        lat: fix?.latitude ?? vor?.latitude ?? ndb?.latitude ?? 0,
        lon: fix?.longitude ?? vor?.longitude ?? ndb?.longitude ?? 0,
        fixId: fix?.id,
        vorId: vor?.id,
        ndbId: ndb?.id,
      });
    }
  }
  if (current && current.points.length) regions.push(current);

  const applicable = regions.filter((r) => freqByStation.has(r.station) && r.points.length > 2);
  const toDelete = await prisma.frequencyBoundary.findMany({
    where: { atcFrequencyId: { in: applicable.map((r) => freqByStation.get(r.station)!) } },
    select: { id: true, atcFrequencyId: true },
  });
  const preview = {
    toDelete: toDelete.length,
    toAdd: applicable.length,
    stations: applicable.map((r) => r.station),
  };
  if (!confirm) return { preview };

  await prisma.$transaction(
    applicable.flatMap((region) => {
      const freqId = freqByStation.get(region.station);
      if (!freqId) return [];
      return [
        prisma.frequencyBoundary.deleteMany({ where: { atcFrequencyId: freqId } }),
        prisma.frequencyBoundary.create({
          data: {
            atcFrequencyId: freqId,
            points: {
              create: region.points.map((p, idx) => ({
                order: idx,
                lat: p.lat,
                lon: p.lon,
                fixId: p.fixId ?? null,
                vorId: p.vorId ?? null,
                ndbId: p.ndbId ?? null,
              })),
            },
          },
        }),
      ];
    }),
  );

  revalidatePath("/[locale]/admin/airac");
  return { preview, applied: true };
}

export async function importAirportsFromAirac(formData: FormData) {
  await ensureAdmin();
  const file = formData.get("file") as File | Blob | null;
  if (!file) throw new Error("Missing file");
  const text = await file.text();
  const confirm = String(formData.get("confirm") ?? "").toLowerCase() === "true";
  const firId = String(formData.get("firId") ?? "").trim() || null;
  const selectedAdd = formData.getAll("selectedAdd").map((s) => String(s).toUpperCase());
  const selectedUpdate = formData.getAll("selectedUpdate").map((s) => String(s).toUpperCase());

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries = lines
    .map((line) => {
      const parts = line.replace(/;+$/, "").split(";").map((p) => p.trim());
      if (parts.length < 5) return null;
      const icao = parts[0]?.toUpperCase();
      const altitude = parts[1] && !Number.isNaN(Number(parts[1])) ? Number(parts[1]) : null;
      const lat = parseCoord(parts[3]);
      const lon = parseCoord(parts[4]);
      const name = parts[5] || "";
      if (!icao || lat == null || lon == null) return null;
      return { icao, name, lat, lon, altitude };
    })
    .filter(Boolean) as { icao: string; name: string; lat: number; lon: number; altitude: number | null }[];

  // dedupe by ICAO
  const deduped = Array.from(new Map(entries.map((e) => [e.icao, e])).values());

  const existing = await prisma.airport.findMany({
    where: { icao: { in: deduped.map((e) => e.icao) } },
    select: { id: true, icao: true, name: true, latitude: true, longitude: true, altitudeFt: true, firId: true },
  });
  const existingMap = new Map(existing.map((a) => [a.icao.toUpperCase(), a]));

  const toAdd: typeof deduped = [];
  const toUpdate: typeof deduped = [];
  for (const e of deduped) {
    const ex = existingMap.get(e.icao);
    if (!ex) {
      toAdd.push(e);
    } else {
      const changed =
        ex.name !== e.name ||
        ex.latitude !== e.lat ||
        ex.longitude !== e.lon ||
        (e.altitude != null && ex.altitudeFt !== e.altitude) ||
        (firId && ex.firId !== firId);
      if (changed) toUpdate.push(e);
    }
  }

  const preview = { toAdd: toAdd.map((e) => e.icao), toUpdate: toUpdate.map((e) => e.icao) };
  if (!confirm) return { preview };

  const filteredAdd = selectedAdd.length ? toAdd.filter((e) => selectedAdd.includes(e.icao)) : toAdd;
  const filteredUpdate = selectedUpdate.length ? toUpdate.filter((e) => selectedUpdate.includes(e.icao)) : toUpdate;

  const ops = [
    ...filteredAdd.map((e) =>
      prisma.airport.create({
        data: {
          icao: e.icao,
          name: e.name || e.icao,
          latitude: e.lat,
          longitude: e.lon,
          altitudeFt: e.altitude ?? 0,
          firId: firId || undefined,
          runways: "[]",
          frequencies: "[]",
          holdingPoints: "[]",
          notes: JSON.stringify({}),
        },
      }),
    ),
    ...filteredUpdate.map((e) =>
      prisma.airport.update({
        where: { icao: e.icao },
        data: {
          name: e.name || e.icao,
          latitude: e.lat,
          longitude: e.lon,
          altitudeFt: e.altitude ?? 0,
          firId: firId || undefined,
        },
      }),
    ),
  ];

  if (ops.length) {
    await prisma.$transaction(ops);
  }

  revalidatePath("/[locale]/admin/airac");
  revalidatePath("/[locale]/admin/airports");
  revalidatePath("/[locale]/airports");

  return { preview, applied: true };
}
