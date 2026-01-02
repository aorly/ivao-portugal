"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";
import { auth } from "@/lib/auth";
import { requireStaffPermission } from "@/lib/staff";
import { logAudit } from "@/lib/audit";


const ensureAirports = async () => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const allowed = await requireStaffPermission("admin:airports");
  if (!allowed) throw new Error("Unauthorized");
  return session;
};

function parseAirportForm(formData: FormData) {
  const icao = String(formData.get("icao") ?? "").toUpperCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const iata = formData.get("iata") ? String(formData.get("iata")) : null;
  const firId = formData.get("firId") ? String(formData.get("firId")) : null;
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
          const holdingPoints =
            "holdingPoints" in r && Array.isArray((r as { holdingPoints?: unknown }).holdingPoints)
              ? (r as { holdingPoints?: unknown }).holdingPoints
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

  return { icao, name, iata, firId, latitude, longitude, runwaysJson, frequenciesIds, chartLinks, sceneryLinks, puckLayout };
}

export async function createAirport(formData: FormData, locale: Locale) {
  const session = await ensureAirports();
  const { icao, name, iata, firId, latitude, longitude, runwaysJson, frequenciesIds, chartLinks, sceneryLinks, puckLayout } =
    parseAirportForm(formData);

  if (!icao || !name || latitude === null || longitude === null) {
    throw new Error("ICAO, name, latitude and longitude are required");
  }

  const created = await prisma.airport.create({
    data: {
      icao,
      name,
      iata,
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
  const { icao, name, iata, firId, latitude, longitude, runwaysJson, frequenciesIds, chartLinks, sceneryLinks, puckLayout } =
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
