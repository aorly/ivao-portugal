type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const API_BASE = process.env.IVAO_API_BASE ?? "https://api.ivao.aero";
const API_KEY = process.env.IVAO_API_KEY;
const CLIENT_ID = process.env.IVAO_CLIENT_ID;
const CLIENT_SECRET = process.env.IVAO_CLIENT_SECRET;
const CLIENT_SCOPE = process.env.IVAO_OAUTH_SCOPE ?? "openid profile email";

const defaultFetcher: Fetcher = (input, init) => fetch(input, init);

type TokenResponse = { access_token: string; token_type: string; expires_in?: number };

let cachedToken: { value: string; expiresAt: number } | null = null;

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function getAccessToken(fetcher: Fetcher = defaultFetcher): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > nowSeconds() + 30) {
    return cachedToken.value;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return null;
  }

  const res = await fetcher(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: CLIENT_SCOPE,
    }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as TokenResponse;
  const token = data.access_token;
  if (!token) return null;

  const expiresAt = nowSeconds() + (data.expires_in ?? 300);
  cachedToken = { value: token, expiresAt };
  return token;
}

async function apiGet<T>(
  path: string,
  fetcher: Fetcher = defaultFetcher,
  bearerOverride?: string,
  options?: { silent?: boolean },
): Promise<T> {
  const bearer = bearerOverride ?? (await getAccessToken(fetcher));
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (API_KEY) {
    headers["X-API-Key"] = API_KEY;
  }
  const res = await fetcher(`${API_BASE}${path}`, {
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    let bodySnippet = "";
    try {
      bodySnippet = await res.text();
    } catch {
      bodySnippet = "";
    }
    const clipped = bodySnippet ? ` | body: ${bodySnippet.slice(0, 240)}` : "";
    const message = `IVAO API error: ${res.status} ${res.statusText}${clipped}`;
    if (!options?.silent) {
      // Log server-side for debugging purposes.
      // eslint-disable-next-line no-console
      console.error("[ivaoClient]", message, { path });
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const ivaoClient = {
  getWhazzup() {
    return apiGet<unknown>("/v2/tracker/whazzup", undefined, undefined, { silent: true }).catch(() => null);
  },
  getOnlineAtc() {
    return apiGet<unknown>("/v2/tracker/atc", undefined, undefined, { silent: true }).catch(() => []);
  },
  getFlights() {
    return apiGet<unknown>("/v2/tracker/flights", undefined, undefined, { silent: true }).catch(() => []);
  },
  async getMetarTaf(icao: string) {
    const upper = icao.toUpperCase();
    // Try a generic airport endpoint first; structure may vary by API version.
    const data = await apiGet<any>(`/v2/airports/${upper}`, undefined, undefined, { silent: true }).catch(() => null);
    if (!data) return { metar: null as string | null, taf: null as string | null };
    const metar =
      data?.metar?.raw ??
      data?.metar ??
      data?.weather?.metar ??
      data?.data?.metar ??
      null;
    const taf =
      data?.taf?.raw ??
      data?.taf ??
      data?.weather?.taf ??
      data?.data?.taf ??
      null;
    return { metar: metar ?? null, taf: taf ?? null };
  },
  getAtcBookings(bearerOverride?: string) {
    return apiGet<unknown>("/v2/bookings/atc", undefined, bearerOverride, { silent: true }).catch(() => []);
  },
  createAtcBooking(body: Record<string, unknown>, bearerOverride: string) {
    return fetch(`${API_BASE}/v2/bookings/atc`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(bearerOverride ? { Authorization: `Bearer ${bearerOverride}` } : {}),
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`IVAO booking failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    });
  },
  deleteAtcBooking(id: string, bearerOverride: string) {
    return fetch(`${API_BASE}/v2/bookings/atc/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(bearerOverride ? { Authorization: `Bearer ${bearerOverride}` } : {}),
        ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      },
      cache: "no-store",
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`IVAO booking delete failed: ${res.status} ${res.statusText}`);
      }
      return res.json();
    });
  },
  getCurrentUser(bearerOverride?: string) {
    return apiGet<unknown>("/v2/users/me", undefined, bearerOverride);
  },
  getUserProfile(vid: string, bearerOverride?: string) {
    return apiGet<unknown>(`/v2/users/${vid}`, undefined, bearerOverride);
  },
};
