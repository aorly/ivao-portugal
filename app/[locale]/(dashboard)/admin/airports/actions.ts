"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type Locale } from "@/i18n";

function parseAirportForm(formData: FormData) {
  const icao = String(formData.get("icao") ?? "").toUpperCase().trim();
  const name = String(formData.get("name") ?? "").trim();
  const iata = formData.get("iata") ? String(formData.get("iata")) : null;
  const firSlug = formData.get("fir") ? String(formData.get("fir")).toLowerCase() : null;

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
                      return name ? { name, length: hpLength } : null;
                    }
                    const name = String(h);
                    return name ? { name, length: null } : null;
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

  const frequenciesRaw = String(formData.get("frequencies") ?? "");
  const frequencies = (() => {
    try {
      const parsed = JSON.parse(frequenciesRaw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((f) => {
            if (f && typeof f === "object" && "id" in f && "value" in f) {
              return { id: String((f as { id: unknown }).id), value: String((f as { value: unknown }).value) };
            }
            return null;
          })
          .filter(Boolean);
      }
    } catch {}
    return frequenciesRaw
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => ({ id: v, value: v }));
  })();

  return { icao, name, iata, firSlug, runwaysJson, frequencies };
}

export async function createAirport(formData: FormData, locale: Locale) {
  const { icao, name, iata, firSlug, runwaysJson, frequencies } = parseAirportForm(formData);

  if (!icao || !name) {
    throw new Error("ICAO and name are required");
  }

  const fir = firSlug
    ? await prisma.fir.findUnique({ where: { slug: firSlug }, select: { id: true } })
    : null;

  await prisma.airport.create({
    data: {
      icao,
      name,
      iata,
      latitude: 0,
      longitude: 0,
      altitudeFt: 0,
      firId: fir?.id,
      runways: runwaysJson,
      frequencies: JSON.stringify(frequencies),
      notes: JSON.stringify({}),
      charts: null,
      scenery: null,
    },
  });

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}

export async function updateAirport(airportId: string, formData: FormData, locale: Locale) {
  const { icao, name, iata, firSlug, runwaysJson, frequencies } = parseAirportForm(formData);

  if (!icao || !name) {
    throw new Error("ICAO and name are required");
  }

  const fir = firSlug
    ? await prisma.fir.findUnique({ where: { slug: firSlug }, select: { id: true } })
    : null;

  await prisma.airport.update({
    where: { id: airportId },
    data: {
      icao,
      name,
      iata,
      firId: fir?.id ?? null,
      runways: runwaysJson,
      frequencies: JSON.stringify(frequencies),
      notes: JSON.stringify({}),
    },
  });

  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}

export async function deleteAirport(airportId: string, locale: Locale) {
  await prisma.stand.deleteMany({ where: { airportId } });
  await prisma.airport.delete({ where: { id: airportId } });
  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}

function parseDms(coord: string) {
  const m = coord.match(/^([NSWE])(\d{2,3})\.(\d{2})\.(\d{2}\.\d+)$/i);
  if (!m) return null;
  const [, hemi, deg, min, sec] = m;
  const decimal = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  return hemi === "S" || hemi === "W" ? -decimal : decimal;
}

export async function importStands(formData: FormData, airportId: string, locale: Locale) {
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

  revalidatePath(`/${locale}/admin/airports/${airportId}`);
  revalidatePath(`/${locale}/admin/airports`);
  revalidatePath(`/${locale}/airports`);
}
