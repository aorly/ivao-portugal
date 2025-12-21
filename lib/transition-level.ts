import fs from "node:fs/promises";
import path from "node:path";

export type Band = { min?: number; max?: number; tl: number };
export type TlGroup = { taFt: number; icaos: string[]; bands: Band[] };

const DATA_PATH = path.join(process.cwd(), "data", "transition-levels.json");

const fallback: TlGroup[] = [
  {
    taFt: 4000,
    icaos: ["LPCS", "LPFR", "LPPT", "LPPR", "LPBJ", "LPEV"],
    bands: [
      { max: 942.2, tl: 75 },
      { min: 942.2, max: 959.4, tl: 70 },
      { min: 959.5, max: 977.1, tl: 65 },
      { min: 977.2, max: 995.0, tl: 60 },
      { min: 995.1, max: 1013.2, tl: 55 },
      { min: 1013.3, max: 1031.6, tl: 50 },
      { min: 1031.7, max: 1050.3, tl: 45 },
      { min: 1050.3, tl: 40 },
    ],
  },
  {
    taFt: 5000,
    icaos: ["LPMA", "LPPS"],
    bands: [
      { max: 942.2, tl: 85 },
      { min: 942.2, max: 959.4, tl: 80 },
      { min: 959.5, max: 977.1, tl: 75 },
      { min: 977.2, max: 995.0, tl: 70 },
      { min: 995.1, max: 1013.2, tl: 65 },
      { min: 1013.3, max: 1031.6, tl: 60 },
      { min: 1031.7, max: 1050.3, tl: 55 },
      { min: 1050.3, tl: 50 },
    ],
  },
  {
    taFt: 8000,
    icaos: ["LPVR", "LPBG"],
    bands: [
      { max: 942.2, tl: 115 },
      { min: 942.2, max: 959.4, tl: 110 },
      { min: 959.5, max: 977.1, tl: 105 },
      { min: 977.2, max: 995.0, tl: 100 },
      { min: 995.1, max: 1013.2, tl: 95 },
      { min: 1013.3, max: 1031.6, tl: 90 },
      { min: 1031.7, max: 1050.3, tl: 85 },
      { min: 1050.3, tl: 80 },
    ],
  },
];

let cache: TlGroup[] | null = null;

export async function loadTlGroups(): Promise<TlGroup[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cache = parsed as TlGroup[];
      return cache;
    }
  } catch {
    // ignore
  }
  cache = fallback;
  return cache;
}

export async function saveTlGroups(groups: TlGroup[]) {
  cache = groups;
  await fs.writeFile(DATA_PATH, JSON.stringify(groups, null, 2), "utf-8");
}

export async function getTransitionAltitudeFt(icao: string): Promise<number | null> {
  const groups = await loadTlGroups();
  const group = groups.find((g) => g.icaos.includes(icao.toUpperCase()));
  return group?.taFt ?? null;
}

export async function getTransitionLevel(
  icao: string,
  qnhHpa: number,
): Promise<{ tl: number; taFt: number } | null> {
  if (!Number.isFinite(qnhHpa)) return null;
  const groups = await loadTlGroups();
  const group = groups.find((g) => g.icaos.includes(icao.toUpperCase()));
  if (!group) return null;
  const band = group.bands.find((b) => {
    const aboveMin = b.min === undefined || qnhHpa >= b.min;
    const belowMax = b.max === undefined || qnhHpa <= b.max;
    return aboveMin && belowMax;
  });
  if (!band) return null;
  return { tl: band.tl, taFt: group.taFt };
}

export async function getSupportedAirports(): Promise<string[]> {
  const groups = await loadTlGroups();
  return groups.flatMap((g) => g.icaos);
}
