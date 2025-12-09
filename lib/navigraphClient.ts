type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const API_BASE = process.env.NAVIGRAPH_API_BASE ?? "https://api.navigraph.com";
const API_KEY = process.env.NAVIGRAPH_API_KEY;

const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

async function apiGet<T>(path: string, fetcher: Fetcher = defaultFetcher): Promise<T> {
  const res = await fetcher(`${API_BASE}${path}`, {
    headers: {
      Authorization: API_KEY ? `Bearer ${API_KEY}` : "",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Navigraph API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const navigraphClient = {
  getCharts(icao: string) {
    return apiGet<unknown>(`/charts/${icao}`);
  },
  getAirport(icao: string) {
    return apiGet<unknown>(`/airports/${icao}`);
  },
};
