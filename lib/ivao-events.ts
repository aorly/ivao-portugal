type RawEvent = Record<string, unknown>;

export type IvaoEvent = {
  id: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  startTime: string | null;
  endTime: string | null;
  airports: string[];
  divisions: string[];
  externalUrl: string | null;
};

const normalizeArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data?: unknown[] }).data ?? [];
  if (value && Array.isArray((value as { result?: unknown[] }).result)) return (value as { result?: unknown[] }).result ?? [];
  return [];
};

const stringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

const toIdString = (value: unknown) => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const isAbsoluteUrl = (value?: string | null) => Boolean(value && /^https?:\/\//i.test(value));

const normalizeAirports = (value: unknown) =>
  normalizeArray(value)
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      return stringOrNull(obj.icao ?? obj.code ?? obj.id ?? obj.airport ?? obj.station);
    })
    .filter((item): item is string => Boolean(item))
    .map((item) => item.toUpperCase());

const normalizeDivisions = (value: unknown) => {
  if (typeof value === "string") return [value];
  return normalizeArray(value)
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => Boolean(item));
};

export const normalizeIvaoEvents = (payload: unknown): IvaoEvent[] => {
  const eventsArray = normalizeArray(
    (payload as { events?: unknown })?.events ??
      (payload as { result?: unknown })?.result ??
      payload,
  );

  return eventsArray.map((raw) => {
    const data = raw as RawEvent;
    const fallbackTitle =
      stringOrNull(data.title) ??
      stringOrNull(data.name) ??
      "IVAO Event";
    const eventId =
      toIdString(data.id) ??
      toIdString(data.uuid) ??
      toIdString(data.eventId);
    const urlCandidate =
      stringOrNull(data.url) ??
      stringOrNull(data.link) ??
      stringOrNull(data.webUrl) ??
      stringOrNull(data.website);
    const infoUrl =
      stringOrNull(data.infoUrl) ??
      stringOrNull(data.briefingUrl) ??
      stringOrNull(data.briefing_url);
    const externalUrl = isAbsoluteUrl(infoUrl)
      ? infoUrl
      : isAbsoluteUrl(urlCandidate)
        ? urlCandidate
      : eventId && /^\d+$/.test(eventId)
        ? `https://ivao.events/${eventId}`
        : null;
    const description =
      stringOrNull(data.description) ??
      stringOrNull(data.briefing) ??
      null;
    const bannerUrl =
      stringOrNull(data.banner) ??
      stringOrNull(data.bannerUrl) ??
      stringOrNull(data.imageUrl) ??
      stringOrNull(data.image_url);
    const start =
      stringOrNull(data.start) ??
      stringOrNull(data.startDate) ??
      stringOrNull(data.startTime) ??
      stringOrNull(data.start_at) ??
      stringOrNull(data.start_date);
    const end =
      stringOrNull(data.end) ??
      stringOrNull(data.endDate) ??
      stringOrNull(data.endTime) ??
      stringOrNull(data.end_at) ??
      stringOrNull(data.end_date);

    return {
      id: eventId ?? crypto.randomUUID(),
      title: fallbackTitle,
      description,
      bannerUrl,
      startTime: start ?? null,
      endTime: end ?? null,
      airports: normalizeAirports(data.airports ?? data.aerodromes ?? data.airport ?? data.aerodrome),
      divisions: normalizeDivisions(data.divisions ?? data.division),
      externalUrl,
    };
  });
};
