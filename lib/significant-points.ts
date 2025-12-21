import fs from "node:fs/promises";
import path from "node:path";

export type SignificantPoint = {
  location: string;
  rawCoordinates: string;
  code: string;
  latitude: number | null;
  longitude: number | null;
};

const DATA_PATH = path.join(process.cwd(), "data", "significant-points.csv");
export const RESOURCE_DIR = path.join(process.cwd(), "storage", "significant-points");
const RESOURCE_META_PATH = path.join(RESOURCE_DIR, "metadata.json");

let cache: SignificantPoint[] | null = null;
export type SignificantResource = { name: string; size: number; updatedAt: Date; description?: string };

function parseCoordinate(raw: string): { lat: number; lon: number } | null {
  const normalised = raw.trim().replace(/\s+/g, " ");
  const match = normalised.match(/(\d{2})(\d{2})\s*([NS])\s+(\d{3})(\d{2})\s*([EW])/i);
  if (!match) return null;

  const [, latDeg, latMin, latDir, lonDeg, lonMin, lonDir] = match;
  const latDegrees = Number(latDeg);
  const latMinutes = Number(latMin);
  const lonDegrees = Number(lonDeg);
  const lonMinutes = Number(lonMin);
  if ([latDegrees, latMinutes, lonDegrees, lonMinutes].some((n) => !Number.isFinite(n))) return null;

  let lat = latDegrees + latMinutes / 60;
  let lon = lonDegrees + lonMinutes / 60;
  if (latDir.toUpperCase() === "S") lat = -lat;
  if (lonDir.toUpperCase() === "W") lon = -lon;

  return { lat, lon };
}

function parseCsv(raw: string): SignificantPoint[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startIndex = lines[0]?.toLowerCase().startsWith("location") ? 1 : 0;
  const entries: SignificantPoint[] = [];

  for (const line of lines.slice(startIndex)) {
    const parts = line.split(",");
    if (parts.length < 3) continue;

    const location = parts[0].trim();
    const rawCoordinates = parts[1].trim();
    const code = parts.slice(2).join(",").trim();
    const parsed = parseCoordinate(rawCoordinates);

    entries.push({
      location,
      rawCoordinates,
      code,
      latitude: parsed?.lat ?? null,
      longitude: parsed?.lon ?? null,
    });
  }

  return entries;
}

export async function loadSignificantPoints(): Promise<SignificantPoint[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    cache = parseCsv(raw);
  } catch {
    cache = [];
  }
  return cache;
}

export function pointsToCsv(points: SignificantPoint[]): string {
  const header = "Location,Coordinates,Code";
  const rows = points.map((p) => `${p.location},${p.rawCoordinates},${p.code}`);
  return [header, ...rows].join("\n");
}

export function pointsToJson(points: SignificantPoint[]): string {
  return JSON.stringify(points, null, 2);
}

async function loadResourceMetadata(): Promise<Record<string, { description?: string }>> {
  try {
    const raw = await fs.readFile(RESOURCE_META_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? (parsed as Record<string, { description?: string }>) : {};
  } catch {
    return {};
  }
}

async function saveResourceMetadata(data: Record<string, { description?: string }>) {
  await fs.mkdir(RESOURCE_DIR, { recursive: true });
  await fs.writeFile(RESOURCE_META_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function listSignificantResources(): Promise<SignificantResource[]> {
  try {
    const metadata = await loadResourceMetadata();
    const entries = await fs.readdir(RESOURCE_DIR, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile());
    const stats = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(RESOURCE_DIR, file.name);
        const stat = await fs.stat(fullPath);
        const meta = metadata[file.name] ?? {};
        return { name: file.name, size: stat.size, updatedAt: stat.mtime, description: meta.description };
      }),
    );
    return stats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch {
    return [];
  }
}

export async function recordResource(name: string, description?: string) {
  const metadata = await loadResourceMetadata();
  metadata[name] = { description };
  await saveResourceMetadata(metadata);
}
