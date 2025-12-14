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

  const metarJson = (await tryFetch(`/metar?ids=${upper}&format=json&taf=false`)) as any;
  const tafJson = (await tryFetch(`/taf?ids=${upper}&format=json`)) as any;

  const metar =
    Array.isArray(metarJson) && metarJson.length > 0
      ? (metarJson[0]?.rawOb as string | undefined) ??
        (metarJson[0]?.rawText as string | undefined) ??
        (metarJson[0]?.raw as string | undefined) ??
        (metarJson[0]?.raw_report as string | undefined) ??
        null
      : null;
  const taf =
    Array.isArray(tafJson) && tafJson.length > 0
      ? (tafJson[0]?.rawTaf as string | undefined) ??
        (tafJson[0]?.raw as string | undefined) ??
        (tafJson[0]?.raw_text as string | undefined) ??
        (tafJson[0]?.rawReport as string | undefined) ??
        null
      : null;

  return { metar, taf };
}

export async function fetchMetarTaf(icao: string) {
  const upper = icao.toUpperCase();

  // 1) AviationWeather.gov
  try {
    const { metar, taf } = await fetchFromAviationWeather(upper);
    if (metar || taf) return { metar: metar ?? null, taf: taf ?? null };
  } catch {
    // ignore and continue
  }

  // 2) IVAO API fallback
  try {
    const { metar, taf } = await ivaoClient.getMetarTaf(upper);
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
  return res.json() as Promise<unknown>;
}
