export type PuckData = {
  root?: Record<string, unknown>;
  content?: Array<Record<string, unknown>>;
  zones?: Record<string, Array<Record<string, unknown>>>;
};

export const parseEventLayout = (raw?: string | null) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PuckData;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.content)) return null;
    return parsed as any;
  } catch {
    return null;
  }
};