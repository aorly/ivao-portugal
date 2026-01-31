export type AnalyticsEventType = "page_view" | "cta_click";

type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  path: string;
  locale?: string;
  label?: string;
  href?: string;
  title?: string;
  referrer?: string;
  sessionId?: string;
};

type GtagFn = (command: string, action: string, params?: Record<string, unknown>) => void;
type PlausibleFn = (event: string, options?: { props?: Record<string, unknown> }) => void;
type UmamiTracker = { track?: (event: string, data?: Record<string, unknown>) => void };
type AnalyticsWindow = Window & {
  gtag?: GtagFn;
  plausible?: PlausibleFn;
  umami?: UmamiTracker;
};

const getAnalyticsWindow = () => window as AnalyticsWindow;

const SESSION_KEY = "ivao-analytics-session";

const getSessionId = () => {
  if (typeof window === "undefined") return undefined;
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
};

const sendEvent = async (payload: AnalyticsPayload) => {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => null);
};

export const trackPageView = (path: string, locale?: string) => {
  if (typeof window === "undefined") return;
  const win = getAnalyticsWindow();
  if (typeof win.gtag === "function") {
    win.gtag("event", "page_view", {
      page_path: path,
      page_title: document.title,
      page_location: window.location.href,
    });
  }
  if (typeof win.plausible === "function") {
    win.plausible("pageview", { props: { path, locale } });
  }
  if (typeof win.umami?.track === "function") {
    win.umami.track("page_view", { path, locale });
  }
  void sendEvent({
    eventType: "page_view",
    path,
    locale,
    title: document.title,
    referrer: document.referrer || undefined,
    href: window.location.href,
    sessionId: getSessionId(),
  });
};

export const trackCtaClick = (label: string, href?: string) => {
  if (typeof window === "undefined") return;
  const query = window.location.search;
  const fullPath = query ? `${window.location.pathname}${query}` : window.location.pathname;
  const win = getAnalyticsWindow();
  if (typeof win.gtag === "function") {
    win.gtag("event", "select_content", {
      content_type: "cta",
      item_id: label,
      item_name: label,
      link_url: href ?? undefined,
    });
  }
  if (typeof win.plausible === "function") {
    win.plausible("CTA Click", {
      props: { label, href, path: fullPath },
    });
  }
  if (typeof win.umami?.track === "function") {
    win.umami.track("cta_click", {
      label,
      href,
      path: fullPath,
    });
  }
  void sendEvent({
    eventType: "cta_click",
    path: fullPath,
    label,
    href,
    title: document.title,
    referrer: document.referrer || undefined,
    sessionId: getSessionId(),
  });
};
