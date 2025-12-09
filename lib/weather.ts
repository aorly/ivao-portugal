type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_BASE = process.env.WEATHER_API_BASE ?? "https://api.open-meteo.com/v1";
const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

export async function fetchMetarTaf(icao: string) {
  // Placeholder: replace with real METAR/TAF API and auth headers if needed.
  const dummyMetar = `METAR ${icao} 121200Z 18005KT CAVOK 20/12 Q1015 NOSIG`;
  const dummyTaf = `TAF ${icao} 121130Z 1212/1318 18005KT CAVOK`;
  return { metar: dummyMetar, taf: dummyTaf };
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
