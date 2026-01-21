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
  getNowPilotsSummary() {
    return apiGet<unknown>("/v2/tracker/now/pilots/summary", undefined, undefined, { silent: true }).catch(() => []);
  },
  getTrackerSessions(params: Record<string, string | number | boolean | undefined>) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      search.set(key, String(value));
    });
    const qs = search.toString();
    return apiGet<unknown>(`/v2/tracker/sessions${qs ? `?${qs}` : ""}`, undefined, undefined, { silent: true }).catch(
      () => ({ items: [] }),
    );
  },
  getTrackerSessionFlightPlans(sessionId: number | string) {
    return apiGet<unknown>(`/v2/tracker/sessions/${sessionId}/flightPlans`, undefined, undefined, { silent: true }).catch(
      () => [],
    );
  },
  getTrackerSessionTracks(sessionId: number | string) {
    return apiGet<unknown>(`/v2/tracker/sessions/${sessionId}/tracks`, undefined, undefined, { silent: true }).catch(
      () => [],
    );
  },
    async getMetarTaf(icao: string) {
      const upper = icao.toUpperCase();
      type AirportPayload = {
        metar?: { raw?: string } | string;
        taf?: { raw?: string } | string;
        weather?: { metar?: string; taf?: string };
        data?: { metar?: string; taf?: string };
      };
      type TafPayload = { airportIcao?: string; taf?: string; updatedAt?: string };
      const pickRaw = (value: { raw?: string } | string | undefined) => {
        if (!value) return undefined;
        if (typeof value === "string") return value;
        return typeof value.raw === "string" ? value.raw : undefined;
      };
    // Try a generic airport endpoint first; structure may vary by API version.
    const data = await apiGet<AirportPayload | null>(
      `/v2/airports/${upper}`,
      undefined,
      undefined,
      { silent: true },
    ).catch(() => null);
    if (!data) return { metar: null as string | null, taf: null as string | null };
    const metar =
      pickRaw(data?.metar) ??
      data?.weather?.metar ??
      data?.data?.metar ??
      null;
      let taf =
        pickRaw(data?.taf) ??
        data?.weather?.taf ??
        data?.data?.taf ??
        null;
      if (!taf) {
        const tafData = await apiGet<TafPayload | null>(`/v2/airports/${upper}/taf`, undefined, undefined, {
          silent: true,
        }).catch(() => null);
        if (tafData?.taf) {
          taf = tafData.taf;
        }
      }
      return { metar: metar ?? null, taf: taf ?? null };
    },
  getAtcBookings(date?: string, bearerOverride?: string) {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    const dailyPath = `/v2/atc/bookings/daily${query}`;
    const listPath = `/v2/atc/bookings${query}`;
    return apiGet<unknown>(dailyPath, undefined, bearerOverride, { silent: true })
      .catch(() => apiGet<unknown>(listPath, undefined, bearerOverride, { silent: true }))
      .catch(() => []);
  },
  createAtcBooking(body: Record<string, unknown>, bearerOverride: string) {
    return fetch(`${API_BASE}/v2/atc/bookings`, {
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
    return fetch(`${API_BASE}/v2/atc/bookings/${id}`, {
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
  getUserProfile(vid: string, bearerOverride?: string, options?: { silent?: boolean }) {
    return apiGet<unknown>(`/v2/users/${vid}`, undefined, bearerOverride, options);
  },
  async getEvents(): Promise<unknown> {
    // Try v1 events API, fallback to a potential v2 path if present.
    const tryV1 = () => apiGet<unknown>("/v1/events", undefined, undefined, { silent: true });
    const tryV2 = () => apiGet<unknown>("/v2/events", undefined, undefined, { silent: true });
    try {
      return await tryV1();
    } catch {
      return tryV2().catch(() => []);
    }
  },
  getCreators(divisionId: string) {
    const qs = divisionId ? `?divisionId=${encodeURIComponent(divisionId)}` : "";
    return apiGet<unknown>(`/v2/creators${qs}`, undefined, undefined, { silent: true }).catch(() => ({ items: [] }));
  },
  getAirline(icao: string) {
    const upper = icao.toUpperCase();
    return apiGet<unknown>(`/v2/airlines/${upper}`, undefined, undefined, { silent: true }).catch(() => null);
  },
  getAirlineVirtualAirlines(icao: string) {
    const upper = icao.toUpperCase();
    return apiGet<unknown>(`/v2/airlines/${upper}/virtualAirlines`, undefined, undefined, { silent: true }).catch(() => []);
  },
  getVirtualAirline(id: number | string) {
    return apiGet<unknown>(`/v2/virtualAirlines/${id}`, undefined, undefined, { silent: true }).catch(() => null);
  },
  async getVirtualAirlineLogo(id: number | string) {
    const bearer = await getAccessToken();
    const headers: Record<string, string> = {};
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }
    if (API_KEY) {
      headers["X-API-Key"] = API_KEY;
    }
    const res = await fetch(`${API_BASE}/v2/virtualAirlines/${id}/mainLogo`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const data = await res.arrayBuffer();
    return { contentType, data };
  },
  async getAirlineLogo(icao: string) {
    const upper = icao.toUpperCase();
    const bearer = await getAccessToken();
    const headers: Record<string, string> = {};
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }
    if (API_KEY) {
      headers["X-API-Key"] = API_KEY;
    }
    const res = await fetch(`${API_BASE}/v2/airlines/${upper}/logo`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    const data = await res.arrayBuffer();
    return { contentType, data };
  },
  getDivisionUsers(divisionId: string) {
    const id = divisionId.toUpperCase();
    const query = new URLSearchParams({
      page: "1",
      perPage: "500",
      networkRating: "active",
      includeHours: "true",
      includeRatings: "true",
    });
    return apiGet<unknown>(`/v2/divisions/${id}/users?${query.toString()}`, undefined, undefined, { silent: true }).catch(
      () => [],
    );
  },
  getDivisionGcaHolders(divisionId: string) {
    const id = divisionId.toUpperCase();
    return apiGet<unknown>(`/v2/divisions/${id}/gca-holders`, undefined, undefined, { silent: true }).catch(() => []);
  },
  getAirport(icao: string) {
    const upper = icao.toUpperCase();
    return apiGet<unknown>(`/v2/airports/${upper}`, undefined, undefined, { silent: true }).catch(() => null);
  },
  getAirportRunways(icao: string) {
    const upper = icao.toUpperCase();
    return apiGet<unknown>(`/v2/airports/${upper}/runways`, undefined, undefined, { silent: true }).catch(() => []);
  },
  getAirportAtcPositions(icao: string) {
    const upper = icao.toUpperCase();
    return apiGet<unknown>(`/v2/airports/${upper}/ATCPositions`, undefined, undefined, { silent: true }).catch(() => []);
  },
  getCenterSubcenters(centerId: string) {
    const upper = centerId.toUpperCase();
    return apiGet<unknown>(`/v2/centers/${upper}/subcenters`, undefined, undefined, { silent: true }).catch(() => []);
  },
  getSubcenter(id: string | number) {
    return apiGet<unknown>(`/v2/subcenters/${id}`, undefined, undefined, { silent: true }).catch(() => null);
  },
  getUserStaffPositions(
    divisionId: string,
    page: number,
    options?: { perPage?: number; isVacant?: boolean },
  ) {
    const id = divisionId.toUpperCase();
    const perPage = options?.perPage ?? 50;
    const isVacant = options?.isVacant;
    const query = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      divisionId: id,
    });
    if (typeof isVacant === "boolean") {
      query.set("isVacant", String(isVacant));
    }
    return apiGet<unknown>(`/v2/userStaffPositions?${query.toString()}`, undefined, undefined, { silent: true }).catch(
      (error) => ({ error: error instanceof Error ? error.message : String(error) }),
    );
  },
};
