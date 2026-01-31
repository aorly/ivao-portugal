import { ivaoClient } from "./ivaoClient";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE = process.env.WEATHER_API_BASE ?? "https://api.open-meteo.com/v1";
const AVIATION_BASE = process.env.AVIATION_WEATHER_BASE ?? "https://aviationweather.gov/api/data";
const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

async function fetchFromAviationWeather(icao: string) {
  const upper = icao.toUpperCase();
  const tryFetch = async (path: string) => {
    const res = await fetch(`${AVIATION_BASE}${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return res.json().catch(() => null);
  };

  const metarJson = (await tryFetch(`/metar?ids=${upper}&format=json&taf=false`)) as unknown;
  const tafJson = (await tryFetch(`/taf?ids=${upper}&format=json`)) as unknown;

  const getFirst = (payload: unknown): Record<string, unknown> | null => {
    if (!Array.isArray(payload) || payload.length === 0) return null;
    const first = payload[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  };

  const metarFirst = getFirst(metarJson);
  const tafFirst = getFirst(tafJson);

  const metar =
    (metarFirst?.rawOb as string | undefined) ??
    (metarFirst?.rawText as string | undefined) ??
    (metarFirst?.raw as string | undefined) ??
    (metarFirst?.raw_report as string | undefined) ??
    null;
  const taf =
    (tafFirst?.rawTaf as string | undefined) ??
    (tafFirst?.raw as string | undefined) ??
    (tafFirst?.raw_text as string | undefined) ??
    (tafFirst?.rawReport as string | undefined) ??
    null;

  return { metar, taf };
}

export async function fetchMetarTaf(icao: string) {
  const upper = icao.toUpperCase();
  let metar: string | null = null;
  let taf: string | null = null;

  // 1) AviationWeather.gov
  try {
    const aviation = await fetchFromAviationWeather(upper);
    metar = aviation.metar ?? null;
    taf = aviation.taf ?? null;
    if (metar && taf) return { metar, taf };
  } catch {
    // ignore and continue
  }

  // 2) IVAO API fallback
  try {
    const ivao = await ivaoClient.getMetarTaf(upper);
    if (!metar && ivao.metar) metar = ivao.metar;
    if (!taf && ivao.taf) taf = ivao.taf;
    if (metar || taf) return { metar: metar ?? null, taf: taf ?? null };
  } catch {
    // ignore and continue
  }

  // 3) Explicit unavailable markers
  return { metar: `METAR ${upper} not available`, taf: `TAF ${upper} not available` };
}

export async function fetchWeatherByCoords(lat: number, lon: number, fetchFn: Fetcher = defaultFetcher) {
  const res = await fetchFn(
    `${WEATHER_API_BASE}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
    {
      headers: WEATHER_API_KEY ? { Authorization: `Bearer ${WEATHER_API_KEY}` } : undefined,
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as unknown;
}
