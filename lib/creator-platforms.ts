type CreatorLink = {
  type: string;
  url: string;
};

type PlatformStatus = {
  isLive: boolean;
  bannerUrl?: string;
  liveUrl?: string;
  platform: "twitch" | "youtube";
};

const TWITCH_ID = process.env.TWITCH_ID;
const TWITCH_SECRET = process.env.TWITCH_SECRET;
const YOUTUBE_API = process.env.YOUTUBE_API;

let twitchTokenCache: { token: string; expiresAt: number } | null = null;

const nowSeconds = () => Math.floor(Date.now() / 1000);

const parseUrl = (value: string) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const parseTwitchLogin = (url: string) => {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  if (!parsed.hostname.includes("twitch.tv")) return null;
  const path = parsed.pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  return path ? path.toLowerCase() : null;
};

const parseYoutubeChannel = (url: string) => {
  const parsed = parseUrl(url);
  if (!parsed) return null;
  if (!parsed.hostname.includes("youtube.com")) return null;
  const path = parsed.pathname.replace(/\/+$/, "");
  if (path.startsWith("/channel/")) {
    return { channelId: path.split("/")[2] ?? "" };
  }
  if (path.startsWith("/@")) {
    return { handle: path.split("/")[1]?.slice(1) ?? "" };
  }
  if (path.startsWith("/user/")) {
    return { username: path.split("/")[2] ?? "" };
  }
  if (path.startsWith("/c/")) {
    return { custom: path.split("/")[2] ?? "" };
  }
  return null;
};

const getTwitchToken = async (): Promise<string | null> => {
  if (!TWITCH_ID || !TWITCH_SECRET) return null;
  if (twitchTokenCache && twitchTokenCache.expiresAt > nowSeconds() + 60) {
    return twitchTokenCache.token;
  }
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_ID,
      client_secret: TWITCH_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  twitchTokenCache = {
    token: data.access_token,
    expiresAt: nowSeconds() + (data.expires_in ?? 600),
  };
  return data.access_token;
};

const getTwitchStatus = async (login: string): Promise<PlatformStatus | null> => {
  const token = await getTwitchToken();
  if (!token || !TWITCH_ID) return null;
  const headers = {
    "Client-ID": TWITCH_ID,
    Authorization: `Bearer ${token}`,
  };
  const [userRes, streamRes] = await Promise.all([
    fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`, {
      headers,
      next: { revalidate: 120 },
    }),
    fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`, {
      headers,
      next: { revalidate: 60 },
    }),
  ]);
  if (!userRes.ok || !streamRes.ok) return null;
  const userData = (await userRes.json()) as { data?: Array<{ offline_image_url?: string; profile_image_url?: string }> };
  const streamData = (await streamRes.json()) as { data?: unknown[] };
  const user = userData.data?.[0];
  const bannerUrl = user?.offline_image_url || user?.profile_image_url || undefined;
  const isLive = (streamData.data ?? []).length > 0;
  return {
    isLive,
    bannerUrl,
    liveUrl: `https://www.twitch.tv/${login}`,
    platform: "twitch",
  };
};

const fetchYoutubeJson = async (url: string) => {
  const res = await fetch(url, { next: { revalidate: 120 } });
  if (!res.ok) return null;
  return (await res.json()) as unknown;
};

const getYoutubeChannel = async (link: string) => {
  if (!YOUTUBE_API) return null;
  const parsed = parseYoutubeChannel(link);
  if (!parsed) return null;
  const base = "https://www.googleapis.com/youtube/v3/channels?part=snippet,brandingSettings";
  if (parsed.channelId) {
    return fetchYoutubeJson(`${base}&id=${encodeURIComponent(parsed.channelId)}&key=${YOUTUBE_API}`);
  }
  if (parsed.handle) {
    return fetchYoutubeJson(`${base}&forHandle=${encodeURIComponent(parsed.handle)}&key=${YOUTUBE_API}`);
  }
  if (parsed.username) {
    return fetchYoutubeJson(`${base}&forUsername=${encodeURIComponent(parsed.username)}&key=${YOUTUBE_API}`);
  }
  if (parsed.custom) {
    const searchUrl =
      "https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=1" +
      `&q=${encodeURIComponent(parsed.custom)}&key=${YOUTUBE_API}`;
    const search = (await fetchYoutubeJson(searchUrl)) as { items?: Array<{ id?: { channelId?: string } }> } | null;
    const channelId = search?.items?.[0]?.id?.channelId;
    if (!channelId) return null;
    return fetchYoutubeJson(`${base}&id=${encodeURIComponent(channelId)}&key=${YOUTUBE_API}`);
  }
  return null;
};

const getYoutubeStatus = async (link: string): Promise<PlatformStatus | null> => {
  const payload = (await getYoutubeChannel(link)) as
    | { items?: Array<{ id?: string; snippet?: { thumbnails?: { high?: { url?: string } } }; brandingSettings?: { image?: { bannerExternalUrl?: string } } }> }
    | null;
  const item = payload?.items?.[0];
  if (!item || !item.id || !YOUTUBE_API) return null;
  const rawBanner =
    item.brandingSettings?.image?.bannerExternalUrl ||
    item.snippet?.thumbnails?.high?.url ||
    undefined;
  const bannerUrl = rawBanner ? rawBanner.replace(/^http:/, "https:") : undefined;
  const liveUrl =
    "https://www.googleapis.com/youtube/v3/search?part=id&type=video&eventType=live" +
    `&channelId=${encodeURIComponent(item.id)}&key=${YOUTUBE_API}`;
  const livePayload = (await fetchYoutubeJson(liveUrl)) as { items?: unknown[] } | null;
  const isLive = (livePayload?.items ?? []).length > 0;
  return {
    isLive,
    bannerUrl,
    liveUrl: link,
    platform: "youtube",
  };
};

export const getCreatorPlatformStatus = async (links: CreatorLink[]) => {
  const twitchLink = links.find((link) => link.type.toLowerCase() === "twitch");
  const youtubeLink = links.find((link) => link.type.toLowerCase() === "youtube");
  const twitchLogin = twitchLink ? parseTwitchLogin(twitchLink.url) : null;

  const [twitchStatus, youtubeStatus] = await Promise.all([
    twitchLogin ? getTwitchStatus(twitchLogin) : Promise.resolve(null),
    youtubeLink ? getYoutubeStatus(youtubeLink.url) : Promise.resolve(null),
  ]);

  const livePlatform = twitchStatus?.isLive
    ? "twitch"
    : youtubeStatus?.isLive
      ? "youtube"
      : null;

  return {
    livePlatform,
    bannerUrl: twitchStatus?.bannerUrl || youtubeStatus?.bannerUrl,
    twitchLive: twitchStatus?.isLive ?? false,
    youtubeLive: youtubeStatus?.isLive ?? false,
    liveUrl: livePlatform === "twitch" ? twitchStatus?.liveUrl : youtubeStatus?.liveUrl,
  };
};
