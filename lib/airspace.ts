import fs from "node:fs/promises";
import path from "node:path";

export type AirspaceBand = {
  from: string;
  to: string;
  class: string;
  note?: string;
};

export type AirspaceSegment = {
  id: string;
  slug: string;
  fir?: string | null;
  title: string;
  lateralLimits: string;
  service: string;
  remarks?: string | null;
  source?: string | null;
  bands: AirspaceBand[];
  boundaryId?: string | null;
};

const DATA_PATH = path.join(process.cwd(), "data", "airspace-segments.json");

type LatLon = { lat: number; lon: number };

export async function loadAirspaceSegments(): Promise<AirspaceSegment[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AirspaceSegment[];
    return parsed.map((s) => ({
      ...s,
      id: s.id ?? s.slug,
      slug: s.slug ?? s.id,
      fir: s.fir ?? "LPPC",
      bands: s.bands ?? [],
    }));
  } catch {
    return [];
  }
}

export async function saveAirspaceSegments(segments: AirspaceSegment[]) {
  await fs.writeFile(DATA_PATH, JSON.stringify(segments, null, 2), "utf-8");
}

// Parse tokens like 4300N 01300W or 333143.43N 0165703.55W into decimal degrees
function parseCoord(coord: string, isLat: boolean): number | null {
  const match = coord.match(/^(\d{2,3})(\d{2})(\d{0,2}(?:\.\d+)?)?([NSEW])$/i);
  if (!match) return null;
  const [, degStr, minStr, secStr, hemiRaw] = match;
  const deg = Number(degStr);
  const min = Number(minStr);
  const sec = secStr ? Number(secStr) : 0;
  const hemi = hemiRaw.toUpperCase();
  const sign = hemi === "S" || hemi === "W" ? -1 : 1;
  const decimals = deg + min / 60 + sec / 3600;
  // Basic validation for lat/lon ranges
  if (isLat && decimals > 90) return null;
  if (!isLat && decimals > 180) return null;
  return decimals * sign;
}

export function parseLateralCoords(text: string): LatLon[] {
  const pairs = Array.from(text.matchAll(/(\d{4,7}(?:\.\d+)?[NS])\s*(\d{5,8}(?:\.\d+)?[EW])/gi));
  const coords: LatLon[] = [];
  for (const match of pairs) {
    const latRaw = match[1].replace(/[^\dNESW.]/gi, "");
    const lonRaw = match[2].replace(/[^\dNESW.]/gi, "");
    const lat = parseCoord(latRaw, true);
    const lon = parseCoord(lonRaw, false);
    if (lat !== null && lon !== null) {
      coords.push({ lat, lon });
    }
  }
  return coords;
}
