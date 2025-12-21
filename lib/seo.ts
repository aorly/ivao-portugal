const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const raw = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
