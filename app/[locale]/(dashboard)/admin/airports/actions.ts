"use server";

import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { logAudit } from "@/lib/audit";
import { ivaoClient } from "@/lib/ivaoClient";


const ensureAirports = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:airports");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

const TRAINING_IMAGE_DIR = "airport-training";
const IMAGE_ROOT = path.join(process.cwd(), "public");
const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};
const IMAGE_EXTENSIONS = new Set(Object.values(IMAGE_TYPES));

const saveTrainingImageUpload = async (entry: FormDataEntryValue | null) => {
  if (!entry || typeof entry !== "object" || !("arrayBuffer" in entry)) return null;
  const file = entry as File;
  if (file.size === 0) return null;
  const contentType = file.type.split(";")[0].trim().toLowerCase();
  let ext: string | undefined = IMAGE_TYPES[contentType];
  if (!ext && file.name) {
    const nameExt = path.extname(file.name).toLowerCase();
    ext = IMAGE_EXTENSIONS.has(nameExt) ? nameExt : undefined;
  }
  if (!ext) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${crypto.randomUUID()}${ext}`;
  const targetDir = path.join(IMAGE_ROOT, TRAINING_IMAGE_DIR);
  await fs.mkdir(targetDir, { recursive: true });
  await fs.writeFile(path.join(targetDir, filename), buffer);
  return `/${TRAINING_IMAGE_DIR}/${filename}`;
};

function parseAirportForm(formData: FormData) {
  const icao = String(formData.get("icao") ?? "").toUpperCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const iata = formData.get("iata") ? String(formData.get("iata")) : null;
  const firId = formData.get("firId") ? String(formData.get("firId")) : null;
  const featured = formData.get("featured") === "on";
  const latRaw = formData.get("lat");
  const lonRaw = formData.get("lon");
  const latitude = latRaw !== null && latRaw !== undefined && !Number.isNaN(Number(latRaw)) ? Number(latRaw) : null;
  const longitude = lonRaw !== null && lonRaw !== undefined && !Number.isNaN(Number(lonRaw)) ? Number(lonRaw) : null;
  const frequenciesIds = formData.getAll("frequencyIds").map((id) => String(id));
  const chartLinks = formData
    .getAll("chartUrl")
    .map((val) => {
      const url = String(val).trim();
      if (!url) return null;
      return { url };
    })
    .filter(Boolean) as { url: string }[];
  const sceneryLinks = formData
    .getAll("sceneryUrl")
    .map((val, idx) => {
      const url = String(val).trim();
      const simulator = String(formData.getAll("scenerySimulator")[idx] ?? "").trim();
      if (!url) return null;
      return { url, simulator: simulator || null };
    })
    .filter(Boolean) as { url: string; simulator: string | null }[];
  const puckLayoutRaw = formData.get("puckLayout") ? String(formData.get("puckLayout")) : "";
  const puckLayout = puckLayoutRaw.trim() ? puckLayoutRaw.trim() : null;

  const runwaysRaw = String(formData.get("runways") ?? "[]");
  let runwaysJson = "[]";
  try {
    const parsed = JSON.parse(runwaysRaw);
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const id = "id" in r ? String((r as { id: unknown }).id) : "";
          if (!id) return null;
          const heading = "heading" in r ? String((r as { heading?: unknown }).heading ?? "") : "";
          const lengthRaw = "length" in r ? (r as { length?: unknown }).length : undefined;
          const length = lengthRaw !== undefined && lengthRaw !== null && !Number.isNaN(Number(lengthRaw)) ? Number(lengthRaw) : null;
          const holdingPointsRaw =
            "holdingPoints" in r ? (r as { holdingPoints?: unknown }).holdingPoints : null;
          const holdingPoints = Array.isArray(holdingPointsRaw)
            ? holdingPointsRaw
                .map((h) => {
                  if (!h) return null;
                  if (typeof h === "object" && "name" in h) {
                    const name = String((h as { name: unknown }).name ?? "");
                    const hpLenRaw = (h as { length?: unknown }).length;
                    const hpLength =
                      hpLenRaw !== undefined && hpLenRaw !== null && !Number.isNaN(Number(hpLenRaw))
                        ? Number(hpLenRaw)
                        : null;
                    const preferred = Boolean((h as { preferred?: unknown }).preferred);
                    return name ? { name, length: hpLength, preferred } : null;
                  }
                  const name = String(h);
                  return name ? { name, length: null, preferred: false } : null;
                })
                .filter(Boolean)
            : [];
          return { id, heading, length, holdingPoints };
        })
        .filter(Boolean);
      runwaysJson = JSON.stringify(normalized);
    }
  } catch {
    runwaysJson = "[]";
  }

  return {
    icao,
    name,
    iata,
    firId,
    featured,
    latitude,
    longitude,
    runwaysJson,
    frequenciesIds,
    chartLinks,
    sceneryLinks,
    puckLayout,
  };
}

export async function createAirport(formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const {
    icao,
    name,
    iata,
    firId,
    featured,
    latitude,
    longitude,
    runwaysJson,
    frequenciesIds,
    chartLinks,
    sceneryLinks,
    puckLayout,
  } =
    parseAirportForm(formData);

  if (!icao || !name || latitude === null || longitude === null) {
    throw new Error("ICAO, name, latitude and longitude are required");
  }

  const created = await prisma.airport.create({
    data: {
      icao,
      name,
      iata,
      featured,
      latitude,
      longitude,
      altitudeFt: 0,
      firId: firId || null,
      runways: runwaysJson,
      frequencies: JSON.stringify(frequenciesIds),
      holdingPoints: "[]",
      notes: JSON.stringify({}),
      charts: JSON.stringify(chartLinks),
      scenery: JSON.stringify(sceneryLinks),
      puckLayout,
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "create",
    entityType: "airport",
    entityId: created.id,
    before: null,
    after: created,
  });

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
  redirect(`/${locale}/admin/airports`);
}

export async function updateAirport(airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const {
    icao,
    name,
    iata,
    firId,
    featured,
    latitude,
    longitude,
    runwaysJson,
    frequenciesIds,
    chartLinks,
    sceneryLinks,
    puckLayout,
  } =
    parseAirportForm(formData);

  if (!icao || !name || latitude === null || longitude === null) {
    throw new Error("ICAO, name, latitude and longitude are required");
  }

  const before = await prisma.airport.findUnique({ where: { id: airportId } });
  const updated = await prisma.airport.update({
    where: { id: airportId },
    data: {
      icao,
      name,
      iata,
      featured,
      latitude,
      longitude,
      firId: firId || null,
      runways: runwaysJson,
      frequencies: JSON.stringify(frequenciesIds),
      holdingPoints: "[]",
      notes: JSON.stringify({}),
      charts: JSON.stringify(chartLinks),
      scenery: JSON.stringify(sceneryLinks),
      puckLayout,
    },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "airport",
    entityId: airportId,
    before,
    after: updated,
  });

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
  redirect(`/${locale}/admin/airports/${airportId}?saved=1`);
}

export async function updateAirportTrainingImage(airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const remove = formData.get("remove") === "true";
  const uploadedUrl = await saveTrainingImageUpload(formData.get("trainingImage"));
  const manualUrl = String(formData.get("trainingImageUrl") ?? "").trim() || null;
  const nextUrl = remove ? null : uploadedUrl ?? manualUrl;

  const before = await prisma.airport.findUnique({ where: { id: airportId } });
  await prisma.airport.update({
    where: { id: airportId },
    data: { trainingImageUrl: nextUrl },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "airport-training-image",
    entityId: airportId,
    before,
    after: { trainingImageUrl: nextUrl },
  });

  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/home`);
}

export async function deleteAirport(airportId: string, locale: Locale) {
  const session = await ensureAirports();
  const before = await prisma.airport.findUnique({ where: { id: airportId } });
  await prisma.stand.deleteMany({ where: { airportId } });
  await prisma.airport.delete({ where: { id: airportId } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "airport",
    entityId: airportId,
    before,
    after: null,
  });
  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}

function parseStandForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const latRaw = formData.get("lat");
  const lonRaw = formData.get("lon");
  const lat = latRaw !== null && latRaw !== undefined && !Number.isNaN(Number(latRaw)) ? Number(latRaw) : null;
  const lon = lonRaw !== null && lonRaw !== undefined && !Number.isNaN(Number(lonRaw)) ? Number(lonRaw) : null;
  return { name, lat, lon };
}

export async function updateStand(standId: string, airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const { name, lat, lon } = parseStandForm(formData);
  if (!name || lat === null || lon === null) throw new Error("Name, lat and lon are required");
  const before = await prisma.stand.findUnique({ where: { id: standId } });
  const updated = await prisma.stand.update({
    where: { id: standId },
    data: { name, lat, lon },
  });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "stand",
    entityId: standId,
    before,
    after: updated,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function deleteStand(standId: string, airportId: string, locale: Locale) {
  const session = await ensureAirports();
  const before = await prisma.stand.findUnique({ where: { id: standId } });
  await prisma.stand.delete({ where: { id: standId } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "stand",
    entityId: standId,
    before,
    after: null,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

function parseProcedureForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const runway = String(formData.get("runway") ?? "").trim();
  return { name, runway };
}

export async function updateSid(sidId: string, airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const { name, runway } = parseProcedureForm(formData);
  if (!name || !runway) throw new Error("Name and runway are required");
  const before = await prisma.sid.findUnique({ where: { id: sidId } });
  const updated = await prisma.sid.update({ where: { id: sidId }, data: { name, runway } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "sid",
    entityId: sidId,
    before,
    after: updated,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

const parseWaypointForm = (formData: FormData) => {
  const names = formData.getAll("wpName").map((v) => String(v).trim());
  const lats = formData.getAll("wpLat").map((v) => Number(v));
  const lons = formData.getAll("wpLon").map((v) => Number(v));
  const alts = formData.getAll("wpAlt").map((v) => String(v).trim());
  const speeds = formData.getAll("wpSpeed").map((v) => String(v).trim());

  const waypoints = [];
  const count = Math.min(names.length, lats.length, lons.length);
  for (let i = 0; i < count; i++) {
    if (!Number.isFinite(lats[i]) || !Number.isFinite(lons[i])) continue;
    waypoints.push({
      name: names[i] || null,
      lat: lats[i],
      lon: lons[i],
      altitudeRestriction: alts[i] || null,
      speedRestriction: speeds[i] || null,
    });
  }
  return waypoints;
};

export async function updateSidPath(sidId: string, airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const waypoints = parseWaypointForm(formData);
  await prisma.sidWaypoint.deleteMany({ where: { sidId } });
  if (waypoints.length) {
    await prisma.sidWaypoint.createMany({
      data: waypoints.map((wp, idx) => ({
        sidId,
        order: idx,
        name: wp.name,
        lat: wp.lat,
        lon: wp.lon,
        altitudeRestriction: wp.altitudeRestriction,
        speedRestriction: wp.speedRestriction,
      })),
    });
  }
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update-path",
    entityType: "sid",
    entityId: sidId,
    before: null,
    after: { waypoints: waypoints.length },
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function deleteSid(sidId: string, airportId: string, locale: Locale) {
  const session = await ensureAirports();
  const before = await prisma.sid.findUnique({ where: { id: sidId } });
  await prisma.sidWaypoint.deleteMany({ where: { sidId } });
  await prisma.sid.delete({ where: { id: sidId } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "sid",
    entityId: sidId,
    before,
    after: null,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function updateStar(starId: string, airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const { name, runway } = parseProcedureForm(formData);
  if (!name || !runway) throw new Error("Name and runway are required");
  const before = await prisma.star.findUnique({ where: { id: starId } });
  const updated = await prisma.star.update({ where: { id: starId }, data: { name, runway } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update",
    entityType: "star",
    entityId: starId,
    before,
    after: updated,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function updateStarPath(starId: string, airportId: string, formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const waypoints = parseWaypointForm(formData);
  await prisma.starWaypoint.deleteMany({ where: { starId } });
  if (waypoints.length) {
    await prisma.starWaypoint.createMany({
      data: waypoints.map((wp, idx) => ({
        starId,
        order: idx,
        name: wp.name,
        lat: wp.lat,
        lon: wp.lon,
        altitudeRestriction: wp.altitudeRestriction,
        speedRestriction: wp.speedRestriction,
      })),
    });
  }
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "update-path",
    entityType: "star",
    entityId: starId,
    before: null,
    after: { waypoints: waypoints.length },
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function deleteStar(starId: string, airportId: string, locale: Locale) {
  const session = await ensureAirports();
  const before = await prisma.star.findUnique({ where: { id: starId } });
  await prisma.starWaypoint.deleteMany({ where: { starId } });
  await prisma.star.delete({ where: { id: starId } });
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "delete",
    entityType: "star",
    entityId: starId,
    before,
    after: null,
  });
  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

function parseDms(coord: string) {
  const m = coord.match(/^([NSWE])(\d{2,3})\.(\d{2})\.(\d{2}\.\d+)$/i);
  if (!m) return null;
  const [, hemi, deg, min, sec] = m;
  const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  return hemi === "S" || hemi === "W" ? -decimal : decimal;
}

const parseCoord = (coord: string | number | null | undefined) => {
  if (coord == null) return null;
  if (typeof coord === "number") return Number.isFinite(coord) ? coord : null;
  const raw = coord.toString().trim();
  if (!raw) return null;
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

export async function importStands(formData: FormData, airportId: string, locale: Locale) {
  const session = await ensureAirports();
  const file = formData.get("standsFile") as File | Blob | null;
  if (!file) {
    throw new Error("No file uploaded");
  }
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const stands = [];
  for (const line of lines) {
    const parts = line.replace(/;+$/, "").split(";");
    if (parts.length < 4) continue;
    const [name, , latStr, lonStr] = parts;
    const lat = parseDms(latStr);
    const lon = parseDms(lonStr);
    if (lat == null || lon == null) continue;
    stands.push({ name: name.trim(), lat, lon });
  }

  if (stands.length === 0) {
    throw new Error("No stands parsed from file. Expected lines like: 104;LPPT;N038.45.59.210;W009.07.46.800;");
  }

  await prisma.$transaction([
    prisma.stand.deleteMany({ where: { airportId } }),
    prisma.stand.createMany({
      data: stands.map((s) => ({
        airportId,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
      })),
    }),
  ]);
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "import",
    entityType: "stand",
    entityId: airportId,
    before: null,
    after: { count: stands.length },
  });

  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}

export async function importStandsAndRedirect(formData: FormData, airportId: string, locale: Locale) {
  await importStands(formData, airportId, locale);
  redirect(`/${locale}/admin/airports/${airportId}?tab=stands`);
}

async function parseAirportIcao(airportId: string) {
  const airport = await prisma.airport.findUnique({ where: { id: airportId }, select: { icao: true } });
  if (!airport) throw new Error("Airport not found");
  return airport.icao.toUpperCase();
}

type ProcPoint = {
  name?: string;
  lat: number;
  lon: number;
  altitudeRestriction?: string | null;
  speedRestriction?: string | null;
  fixId?: string | null;
  vorId?: string | null;
  ndbId?: string | null;
};

function parseProceduresFile(
  text: string,
  airportIcao: string,
  nav: { fixMap: Map<string, { id: string; latitude: number; longitude: number }>; vorMap: Map<string, { id: string; latitude: number; longitude: number }>; ndbMap: Map<string, { id: string; latitude: number; longitude: number }> },
) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: { runway: string; name: string; points: ProcPoint[] }[] = [];
  let current: { runway: string; name: string; points: ProcPoint[] } | null = null;

  const pushCurrent = () => {
    if (current && current.points.length) entries.push(current);
    current = null;
  };

  for (const line of lines) {
    const parts = line.replace(/;+$/, "").split(";").map((p) => p.trim());
    if (parts.length >= 3 && parts[0].toUpperCase() === airportIcao.toUpperCase()) {
      pushCurrent();
      const [, runway, procName] = parts;
      current = { runway: runway || "UNK", name: procName || "PROC", points: [] };
      continue;
    }
    if (!current) continue;

    // Header waypoint lines: NAME;NAME;ALT?
    if (parts.length >= 2 && parts[0].toUpperCase() === parts[1].toUpperCase()) {
      const name = parts[0].toUpperCase();
      const alt = parts.length >= 3 ? (parts[2] || null) : null;
      const fix = nav.fixMap.get(name);
      const vor = nav.vorMap.get(name);
      const ndb = nav.ndbMap.get(name);
      const lat = fix?.latitude ?? vor?.latitude ?? ndb?.latitude ?? null;
      const lon = fix?.longitude ?? vor?.longitude ?? ndb?.longitude ?? null;
      if (lat != null && lon != null) {
        current.points.push({
          name,
          lat,
          lon,
          altitudeRestriction: alt,
          speedRestriction: null,
          fixId: fix?.id ?? null,
          vorId: vor?.id ?? null,
          ndbId: ndb?.id ?? null,
        });
        continue;
      }
    }

    // Coordinate line: lat;lon;alt?
    const coordTokens = parts.map((p) => ({ raw: p, val: parseCoord(p) })).filter((c) => c.val !== null);
    if (coordTokens.length >= 2) {
      const lat = coordTokens[0].val as number;
      const lon = coordTokens[1].val as number;
      const altitudeRestriction = parts.length >= 3 ? parts[2] || null : null;
      current.points.push({ lat, lon, altitudeRestriction, speedRestriction: null });
      continue;
    }

    // Fallback: named point with possible altitude
    const name = parts[0]?.toUpperCase();
    if (!name) continue;
    const fix = nav.fixMap.get(name);
    const vor = nav.vorMap.get(name);
    const ndb = nav.ndbMap.get(name);
    const lat = fix?.latitude ?? vor?.latitude ?? ndb?.latitude ?? null;
    const lon = fix?.longitude ?? vor?.longitude ?? ndb?.longitude ?? null;
    if (lat == null || lon == null) continue;
    const alt = parts.length >= 2 ? parts[1] || null : null;
    current.points.push({
      name,
      lat,
      lon,
      altitudeRestriction: alt,
      speedRestriction: null,
      fixId: fix?.id ?? null,
      vorId: vor?.id ?? null,
      ndbId: ndb?.id ?? null,
    });
  }
  pushCurrent();
  return entries;
}

async function importProcedures(formData: FormData, airportId: string, locale: Locale, type: "SID" | "STAR") {
  const session = await ensureAirports();
  const airportIcao = await parseAirportIcao(airportId);
  const file = formData.get("proceduresFile") as File | Blob | null;
  if (!file) {
    throw new Error("No file uploaded");
  }
  const text = await file.text();

  const [fixes, vors, ndbs] = await Promise.all([
    prisma.fix.findMany({ select: { id: true, name: true, latitude: true, longitude: true } }),
    prisma.vor.findMany({ select: { id: true, ident: true, latitude: true, longitude: true } }),
    prisma.ndb.findMany({ select: { id: true, ident: true, latitude: true, longitude: true } }),
  ]);
  const fixMap = new Map(fixes.map((f) => [f.name.toUpperCase(), f]));
  const vorMap = new Map(vors.map((v) => [v.ident.toUpperCase(), v]));
  const ndbMap = new Map(ndbs.map((n) => [n.ident.toUpperCase(), n]));

  const entries = parseProceduresFile(text, airportIcao, { fixMap, vorMap, ndbMap });

  // Allow selecting specific procedures to import (comma separated or multiple inputs)
  const selectedRaw = [
    ...formData.getAll("selectedProcedures"),
    ...(formData.get("selectedProceduresCsv") ? [String(formData.get("selectedProceduresCsv"))] : []),
  ].flatMap((s) =>
    String(s)
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter(Boolean),
  );
  const selected = selectedRaw.map((s) => s.toUpperCase());
  const filtered = selected.length ? entries.filter((e) => selected.includes(e.name.toUpperCase())) : entries;

  if (type === "SID") {
    await prisma.sidWaypoint.deleteMany({ where: { sid: { airportId } } });
    await prisma.sid.deleteMany({ where: { airportId } });
    for (const entry of filtered) {
      const sid = await prisma.sid.create({
        data: { airportId, runway: entry.runway, name: entry.name },
      });
      if (entry.points.length) {
        await prisma.sidWaypoint.createMany({
          data: entry.points.map((p, idx) => ({
            sidId: sid.id,
            order: idx,
            name: p.name ?? null,
            lat: p.lat,
            lon: p.lon,
            altitudeRestriction: p.altitudeRestriction ?? null,
            speedRestriction: p.speedRestriction ?? null,
            fixId: p.fixId ?? null,
            vorId: p.vorId ?? null,
            ndbId: p.ndbId ?? null,
          })),
        });
      }
    }
  } else {
    await prisma.starWaypoint.deleteMany({ where: { star: { airportId } } });
    await prisma.star.deleteMany({ where: { airportId } });
    for (const entry of filtered) {
      const star = await prisma.star.create({
        data: { airportId, runway: entry.runway, name: entry.name },
      });
      if (entry.points.length) {
        await prisma.starWaypoint.createMany({
          data: entry.points.map((p, idx) => ({
            starId: star.id,
            order: idx,
            name: p.name ?? null,
            lat: p.lat,
            lon: p.lon,
            altitudeRestriction: p.altitudeRestriction ?? null,
            speedRestriction: p.speedRestriction ?? null,
            fixId: p.fixId ?? null,
            vorId: p.vorId ?? null,
            ndbId: p.ndbId ?? null,
          })),
        });
      }
    }
  }
  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "import",
    entityType: type === "SID" ? "sid" : "star",
    entityId: airportId,
    before: null,
    after: { count: filtered.length },
  });

  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
}

export async function importSids(formData: FormData, airportId: string, locale: Locale) {
  return importProcedures(formData, airportId, locale, "SID");
}

export async function importStars(formData: FormData, airportId: string, locale: Locale) {
  return importProcedures(formData, airportId, locale, "STAR");
}

type SyncAirportState = { success?: boolean; error?: string; changes?: string[]; syncedAt?: string };
type SyncAllAirportsState = {
  success?: boolean;
  error?: string;
  updated?: number;
  failed?: number;
  details?: string[];
};
type SyncAirportResult = { icao: string; changes: string[]; syncedAt?: string };

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

const runwayCountFromJson = (value: string | null | undefined) => {
  try {
    return asArray(JSON.parse(value ?? "[]")).length;
  } catch {
    return 0;
  }
};

const clearAirportFrequencies = async (airportId: string) => {
  const freqIds = await prisma.atcFrequency.findMany({
    where: { airportId },
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

const fetchIvaoAirportData = async (icao: string) => {
  const ivaoAirportRaw = await ivaoClient.getAirport(icao);
  if (!ivaoAirportRaw || typeof ivaoAirportRaw !== "object") {
    return null;
  }
  const ivaoAirport = (ivaoAirportRaw as { data?: unknown }).data ?? ivaoAirportRaw;
  const airportData = ivaoAirport as Record<string, unknown>;

  const name = typeof airportData.name === "string" && airportData.name.trim() ? airportData.name.trim() : null;
  const iataRaw = typeof airportData.iata === "string" ? airportData.iata.trim() : null;
  const iata = iataRaw ? iataRaw.toUpperCase() : null;
  const latitude =
    typeof airportData.latitude === "number" && Number.isFinite(airportData.latitude)
      ? airportData.latitude
      : null;
  const longitude =
    typeof airportData.longitude === "number" && Number.isFinite(airportData.longitude)
      ? airportData.longitude
      : null;
  const altitude =
    typeof airportData.elevation === "number" && Number.isFinite(airportData.elevation)
      ? Math.round(airportData.elevation)
      : null;
  const centerId = typeof airportData.centerId === "string" ? airportData.centerId.trim().toUpperCase() : null;
  const fir = centerId
    ? await prisma.fir.findFirst({ where: { slug: centerId }, select: { id: true } })
    : null;

  const runwaysRaw = await ivaoClient.getAirportRunways(icao);
  const runwaysArray = asArray(runwaysRaw);
  const runwaysNormalized = runwaysArray
    .map((r) => {
      const runway = typeof r.runway === "string" ? r.runway.trim() : "";
      if (!runway) return null;
      const bearing =
        typeof r.bearing === "number" && Number.isFinite(r.bearing) ? String(r.bearing) : "";
      const lengthFeet =
        typeof r.length === "number" && Number.isFinite(r.length) ? r.length : null;
      const lengthMeters = lengthFeet !== null ? Math.round(lengthFeet * 0.3048) : null;
      return { id: runway, heading: bearing, length: lengthMeters, holdingPoints: [] as unknown[] };
    })
    .filter(Boolean) as { id: string; heading: string; length: number | null; holdingPoints: unknown[] }[];
  const runwaysJson = JSON.stringify(runwaysNormalized);

  const atcRaw = await ivaoClient.getAirportAtcPositions(icao);
  const atcArray = asArray(atcRaw);
  const atcPositions = atcArray
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

  return {
    name,
    iata,
    latitude,
    longitude,
    altitude,
    firId: fir?.id ?? null,
    runwaysJson,
    runwaysCount: runwaysNormalized.length,
    atcPositions,
  };
};

export async function syncAirportIvao(
  _prevState: SyncAirportState,
  formData: FormData,
): Promise<SyncAirportState> {
  const session = await ensureAirports();
  const airportId = String(formData.get("airportId") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim();
  if (!airportId || !locale) return { success: false, error: "Missing airport id or locale." };

  try {
    const result = await syncAirportIvaoById(airportId, session?.user?.id ?? null);
    revalidatePath(`/${locale}/admin/airports/${airportId}`);
    revalidatePath(`/${locale}/admin/airports`);
    revalidatePath(`/${locale}/airports`);
    return {
      success: true,
      changes: result.changes.length ? result.changes : ["No changes detected."],
      syncedAt: result.syncedAt,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Sync failed." };
  }
}

export async function syncAirportIvaoById(airportId: string, actorId: string | null): Promise<SyncAirportResult> {
  const airport = await prisma.airport.findUnique({ where: { id: airportId } });
  if (!airport) throw new Error("Airport not found.");

  const ivaoData = await fetchIvaoAirportData(airport.icao);
  if (!ivaoData) throw new Error("IVAO airport data unavailable.");
  const { name, iata, latitude, longitude, altitude, firId, runwaysJson, runwaysCount, atcPositions } = ivaoData;
  if (name == null || latitude == null || longitude == null || altitude == null) {
    throw new Error("IVAO airport data incomplete.");
  }

  const changes: string[] = [];
  if (airport.name !== name) changes.push(`Name: ${airport.name} -> ${name}`);
  if ((airport.iata ?? null) !== iata) changes.push(`IATA: ${airport.iata ?? "-"} -> ${iata ?? "-"}`);
  if (Math.abs(airport.latitude - latitude) > 0.0001) changes.push(`Latitude: ${airport.latitude} -> ${latitude}`);
  if (Math.abs(airport.longitude - longitude) > 0.0001) changes.push(`Longitude: ${airport.longitude} -> ${longitude}`);
  if (airport.altitudeFt !== altitude) changes.push(`Elevation: ${airport.altitudeFt}ft -> ${altitude}ft`);
  if ((airport.firId ?? null) !== (firId ?? null)) {
    changes.push(`FIR: ${airport.firId ?? "-"} -> ${firId ?? "-"}`);
  }
  if (airport.runways !== runwaysJson) {
    changes.push(`Runways: ${runwayCountFromJson(airport.runways)} -> ${runwaysCount}`);
  }

  const before = airport;
  const updated = await prisma.airport.update({
    where: { id: airportId },
    data: {
      name,
      iata,
      latitude,
      longitude,
      altitudeFt: altitude,
      ...(firId ? { fir: { connect: { id: firId } } } : { fir: { disconnect: true } }),
      runways: runwaysJson,
      ivaoSyncedAt: new Date(),
    },
  });

  const existingFreqCount = await prisma.atcFrequency.count({ where: { airportId } });
  if (existingFreqCount !== atcPositions.length) {
    changes.push(`ATC positions: ${existingFreqCount} -> ${atcPositions.length}`);
  }

  await clearAirportFrequencies(airportId);
  if (atcPositions.length) {
    await prisma.atcFrequency.createMany({
      data: atcPositions.map((pos) => ({
        station: pos.station,
        name: pos.name,
        frequency: pos.frequency,
        airportId,
      })),
    });
  }

  if (actorId) {
    await logAudit({
      actorId,
      action: "sync-ivao",
      entityType: "airport",
      entityId: airportId,
      before,
      after: updated,
    });
  }

  return {
    icao: airport.icao,
    changes: changes.length ? changes : ["No changes detected."],
    syncedAt: updated.ivaoSyncedAt?.toISOString(),
  };
}

export async function syncAirportByIcao(
  _prevState: SyncAirportState,
  formData: FormData,
): Promise<SyncAirportState> {
  const session = await ensureAirports();
  const locale = String(formData.get("locale") ?? "").trim();
  const icao = String(formData.get("icao") ?? "").trim().toUpperCase();
  if (!icao || !locale) return { success: false, error: "Missing ICAO or locale." };

  const ivaoData = await fetchIvaoAirportData(icao);
  if (!ivaoData) return { success: false, error: "IVAO airport data unavailable." };
  const { name, iata, latitude, longitude, altitude, firId, runwaysJson, runwaysCount, atcPositions } = ivaoData;
  if (!name || latitude == null || longitude == null || altitude == null) {
    return { success: false, error: "IVAO airport data incomplete." };
  }

  const existing = await prisma.airport.findUnique({ where: { icao } });
  const changes: string[] = [];

  let airportId = existing?.id ?? "";
  let updatedAirport = existing;

  if (!existing) {
    const created = await prisma.airport.create({
      data: {
        icao,
        name,
        iata,
        latitude,
        longitude,
        altitudeFt: altitude,
        ...(firId ? { fir: { connect: { id: firId } } } : {}),
        runways: runwaysJson,
        frequencies: JSON.stringify([]),
        holdingPoints: "[]",
        notes: JSON.stringify({}),
        charts: JSON.stringify([]),
        scenery: JSON.stringify([]),
        puckLayout: null,
        ivaoSyncedAt: new Date(),
      },
    });
    airportId = created.id;
    updatedAirport = created;
    changes.push(`Created airport ${icao}`);
  } else {
    if (existing.name !== name) changes.push(`Name: ${existing.name} -> ${name}`);
    if ((existing.iata ?? null) !== iata) changes.push(`IATA: ${existing.iata ?? "-"} -> ${iata ?? "-"}`);
    if (Math.abs(existing.latitude - latitude) > 0.0001) changes.push(`Latitude: ${existing.latitude} -> ${latitude}`);
    if (Math.abs(existing.longitude - longitude) > 0.0001) changes.push(`Longitude: ${existing.longitude} -> ${longitude}`);
    if (existing.altitudeFt !== altitude) changes.push(`Elevation: ${existing.altitudeFt}ft -> ${altitude}ft`);
    if ((existing.firId ?? null) !== (firId ?? null)) {
      changes.push(`FIR: ${existing.firId ?? "-"} -> ${firId ?? "-"}`);
    }
    if (existing.runways !== runwaysJson) {
      changes.push(`Runways: ${runwayCountFromJson(existing.runways)} -> ${runwaysCount}`);
    }

    updatedAirport = await prisma.airport.update({
      where: { id: existing.id },
      data: {
        name,
        iata,
        latitude,
        longitude,
        altitudeFt: altitude,
        ...(firId ? { fir: { connect: { id: firId } } } : { fir: { disconnect: true } }),
        runways: runwaysJson,
        ivaoSyncedAt: new Date(),
      },
    });
  }

  const existingFreqCount = airportId ? await prisma.atcFrequency.count({ where: { airportId } }) : 0;
  if (existingFreqCount !== atcPositions.length) {
    changes.push(`ATC positions: ${existingFreqCount} -> ${atcPositions.length}`);
  }

  if (airportId) {
    await clearAirportFrequencies(airportId);
    if (atcPositions.length) {
      await prisma.atcFrequency.createMany({
        data: atcPositions.map((pos) => ({
          station: pos.station,
          name: pos.name,
          frequency: pos.frequency,
          airportId,
        })),
      });
    }
  }

  await logAudit({
    actorId: session?.user?.id ?? null,
    action: "sync-ivao",
    entityType: "airport",
    entityId: airportId,
    before: existing ?? null,
    after: updatedAirport,
  });

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
  if (airportId) {
    revalidatePath(`/${locale}/admin/airports/${airportId}`);
  }

  return {
    success: true,
    changes: changes.length ? changes : ["No changes detected."],
    syncedAt: updatedAirport?.ivaoSyncedAt?.toISOString(),
  };
}

export async function syncAllAirportsIvao(
  _prevState: SyncAllAirportsState,
  formData: FormData,
): Promise<SyncAllAirportsState> {
  await ensureAirports();
  const locale = String(formData.get("locale") ?? "").trim();
  if (!locale) return { success: false, error: "Missing locale." };

  const airports = await prisma.airport.findMany({ select: { id: true, icao: true, firId: true, name: true, iata: true, latitude: true, longitude: true, altitudeFt: true, runways: true } });
  const details: string[] = [];
  let updated = 0;
  let failed = 0;

  for (const airport of airports) {
    const ivaoData = await fetchIvaoAirportData(airport.icao);
    if (!ivaoData) {
      failed += 1;
      details.push(`${airport.icao}: IVAO data unavailable`);
      continue;
    }
    const { name, iata, latitude, longitude, altitude, firId, runwaysJson, runwaysCount, atcPositions } = ivaoData;
    if (!name || latitude == null || longitude == null || altitude == null) {
      failed += 1;
      details.push(`${airport.icao}: IVAO data incomplete`);
      continue;
    }

    const changes: string[] = [];
    if (airport.name !== name) changes.push("name");
    if ((airport.iata ?? null) !== iata) changes.push("iata");
    if (Math.abs(airport.latitude - latitude) > 0.0001) changes.push("lat");
    if (Math.abs(airport.longitude - longitude) > 0.0001) changes.push("lon");
    if (airport.altitudeFt !== altitude) changes.push("elev");
    if ((airport.firId ?? null) !== (firId ?? null)) changes.push("fir");
    if (airport.runways !== runwaysJson) {
      changes.push(`runways ${runwayCountFromJson(airport.runways)} -> ${runwaysCount}`);
    }

    const existingFreqCount = await prisma.atcFrequency.count({ where: { airportId: airport.id } });
    if (existingFreqCount !== atcPositions.length) {
      changes.push(`atc ${existingFreqCount} -> ${atcPositions.length}`);
    }

    await prisma.airport.update({
      where: { id: airport.id },
      data: {
        name,
        iata,
        latitude,
        longitude,
        altitudeFt: altitude,
        ...(firId ? { fir: { connect: { id: firId } } } : { fir: { disconnect: true } }),
        runways: runwaysJson,
        ivaoSyncedAt: new Date(),
      },
    });

    await clearAirportFrequencies(airport.id);
    if (atcPositions.length) {
      await prisma.atcFrequency.createMany({
        data: atcPositions.map((pos) => ({
          station: pos.station,
          name: pos.name,
          frequency: pos.frequency,
          airportId: airport.id,
        })),
      });
    }

    if (changes.length) {
      updated += 1;
      details.push(`${airport.icao}: ${changes.join(", ")}`);
    }
  }

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);

  return {
    success: true,
    updated,
    failed,
    details: details.length ? details : ["No changes detected."],
  };
}

