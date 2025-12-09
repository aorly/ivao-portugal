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
    // Log server-side for debugging purposes.
    // eslint-disable-next-line no-console
    console.error("[ivaoClient]", message, { path });
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const ivaoClient = {
  getWhazzup() {
    return apiGet<unknown>("/v2/tracker/whazzup");
  },
  getOnlineAtc() {
    return apiGet<unknown>("/atc");
  },
  getFlights() {
    return apiGet<unknown>("/flights");
  },
  getCurrentUser(bearerOverride?: string) {
    return apiGet<unknown>("/v2/users/me", undefined, bearerOverride);
  },
  getUserProfile(vid: string, bearerOverride?: string) {
    return apiGet<unknown>(`/v2/users/${vid}`, undefined, bearerOverride);
  },
};
