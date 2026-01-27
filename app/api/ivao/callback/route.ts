import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { recentMonthKeys, syncMonthlyUserStatsForMonth } from "@/lib/monthly-user-stats";
import { prisma } from "@/lib/prisma";
import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cookies } from "next/headers";

const logAuthEvent = async (message: string) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message.replace(/\s+/g, " ").slice(0, 2000)}\n`;
  const primaryPath =
    process.env.IVAO_AUTH_LOG_PATH ??
    path.join(process.cwd(), "storage", "ivao-auth.log");
  const fallbackPath = path.join(os.tmpdir(), "ivao-auth.log");
  const tryWrite = async (filePath: string) => {
    await mkdir(path.dirname(filePath), { recursive: true });
    await appendFile(filePath, line, "utf8");
  };
  try {
    await tryWrite(primaryPath);
  } catch (err) {
    console.error("[ivao/callback] failed to write log file", err);
    try {
      await tryWrite(fallbackPath);
    } catch (fallbackErr) {
      console.error("[ivao/callback] failed to write fallback log file", fallbackErr);
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: "ivao_auth_error",
        entityType: "oauth",
        after: JSON.stringify({ message: message.slice(0, 2000) }),
      },
    });
  } catch (dbErr) {
    console.error("[ivao/callback] failed to write audit log", dbErr);
  }
};

const STATE_COOKIE = "ivao_oauth_state";
const AUTO_SYNC_LIMIT = 3;
const AUTO_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const autoSyncInFlight = new Set<string>();
const autoSyncLastRun = new Map<string, number>();

const decodeState = (state: string) => {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as { cb?: string; nonce?: string };
    if (parsed?.cb && parsed?.nonce) return parsed;
  } catch {
    // fall through
  }
  return null;
};

const parseState = (state: string, appBaseUrl: string) => {
  const decoded = decodeState(state);
  const callbackPath = decoded?.cb ?? state;
  try {
    const base = new URL(appBaseUrl);
    const target = new URL(callbackPath, base);
    const retry = target.searchParams.get("ivao_retry") === "1";
    return { url: target, retry, base, nonce: decoded?.nonce ?? null };
  } catch {
    return { url: null, retry: false, base: null, nonce: decoded?.nonce ?? null };
  }
};

const withRetryParam = (state: string, appBaseUrl: string) => {
  const parsed = parseState(state, appBaseUrl);
  if (!parsed.url) return state;
  parsed.url.searchParams.set("ivao_retry", "1");
  return `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
};

const stripRetryParam = (state: string, appBaseUrl: string) => {
  const parsed = parseState(state, appBaseUrl);
  if (!parsed.url || !parsed.base) return `${appBaseUrl}/`;
  parsed.url.searchParams.delete("ivao_retry");
  return `${parsed.base.origin}${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
};

export async function GET(req: Request) {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const url = new URL(req.url);
  const state = url.searchParams.get("state") ?? "/";
  const stateInfo = parseState(state, appBaseUrl);
  const code = url.searchParams.get("code");
  const localeFromState = (() => {
    const match = (stateInfo.url?.pathname ?? state).match(/^\/([a-zA-Z-]{2,5})\//);
    return match?.[1] ?? "en";
  })();
  const errorRedirect = (reason: string) =>
    NextResponse.redirect(`${appBaseUrl}/${localeFromState}/login?error=${encodeURIComponent(reason)}`);

  try {
    await logAuthEvent(`callback_received state=${state} code_len=${code ? code.length : 0}`);

    const cookieStore = await cookies();
    const stateCookie = cookieStore.get(STATE_COOKIE)?.value ?? null;
    if (stateInfo.nonce && stateCookie && stateInfo.nonce !== stateCookie) {
      await logAuthEvent(`state_mismatch state=${state}`);
      return errorRedirect("ivao_auth");
    }
    if (stateInfo.nonce && !stateCookie) {
      await logAuthEvent(`state_missing_cookie state=${state}`);
      return errorRedirect("ivao_auth");
    }

    if (!code) {
      await logAuthEvent(`missing_code state=${state}`);
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const tokenUrl = process.env.IVAO_OAUTH_TOKEN ?? "https://api.ivao.aero/v2/oauth/token";
    const clientId = process.env.IVAO_CLIENT_ID;
    const clientSecret = process.env.IVAO_CLIENT_SECRET;
    const apiKey = process.env.IVAO_API_KEY;
    const redirectUri = `${appBaseUrl}/api/ivao/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "IVAO client credentials missing" }, { status: 500 });
    }

    let accessToken: string;
    let refreshToken: string | undefined;
    let expiresAt: number | null = null;
    let tokenType: string | undefined;
    let scope: string | undefined;
    try {
      // Exchange code for tokens
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error("[ivao/callback] token exchange failed", body);
        await logAuthEvent(`token_exchange_failed status=${tokenRes.status} state=${state} body=${body.slice(0, 500)}`);
        let oauthError: { error?: string } | null;
        try {
          oauthError = JSON.parse(body) as { error?: string };
        } catch {
          oauthError = null;
        }
        if (oauthError?.error === "invalid_grant" && !stateInfo.retry) {
          const retryState = withRetryParam(state, appBaseUrl);
          return NextResponse.redirect(`${appBaseUrl}/api/ivao/login?callbackUrl=${encodeURIComponent(retryState)}`);
        }
        if (oauthError?.error === "invalid_grant" && stateInfo.retry) {
          return errorRedirect("ivao_retry");
        }
        return errorRedirect("ivao_auth");
      }

      const tokens = (await tokenRes.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
      };
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
      tokenType = tokens.token_type;
      scope = tokens.scope;
      if (tokens.expires_in) {
        expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
      }
    } catch (err) {
      console.error("[ivao/callback] token exchange error", err);
      await logAuthEvent(`token_exchange_error state=${state} err=${err instanceof Error ? err.message : "unknown"}`);
      return errorRedirect("ivao_auth");
    }

    // Fetch IVAO profile
    const userinfoUrl = process.env.IVAO_OAUTH_USERINFO ?? "https://api.ivao.aero/v2/users/me";
    let profile: {
      id?: string;
      vid?: string;
      sub?: string;
      username?: string;
      name?: string;
      fullName?: string;
      given_name?: string;
      family_name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
      image?: string;
    };
    try {
      const profileRes = await fetch(userinfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
      });
      if (!profileRes.ok) {
        const body = await profileRes.text();
        console.error("[ivao/callback] userinfo failed", body);
        await logAuthEvent(`userinfo_failed status=${profileRes.status} state=${state} body=${body.slice(0, 500)}`);
        return errorRedirect("ivao_profile");
      }
      profile = (await profileRes.json()) as typeof profile;
    } catch (err) {
      console.error("[ivao/callback] userinfo error", err);
      await logAuthEvent(`userinfo_error state=${state} err=${err instanceof Error ? err.message : "unknown"}`);
      return errorRedirect("ivao_profile");
    }

    const rawVid = profile.vid ?? profile.id ?? profile.sub ?? profile.username ?? "unknown";
    const vid = String(rawVid);
    const givenName = profile.given_name ?? profile.firstName ?? "";
    const familyName = profile.family_name ?? profile.lastName ?? "";
    const mergedName = `${givenName} ${familyName}`.trim();
    const name = String(mergedName || profile.fullName || profile.name || profile.username || `Member ${vid}`);
    const image = profile.avatar ?? profile.image ?? null;

    const existingUser = await prisma.user.findUnique({
      where: { vid },
      select: { id: true },
    });

    // Upsert user
    const user = await prisma.user.upsert({
      where: { vid },
      update: {
        name,
        email: profile.email ?? null,
        image,
        avatarUrl: image,
      },
      create: {
        vid,
        name,
        email: profile.email ?? null,
        image,
        avatarUrl: image,
        role: "USER",
      },
      select: { id: true, vid: true, name: true, role: true },
    });

    const scheduleAutoSync = async (monthKeys: string[], force = false) => {
      if (!user.vid) return;
      if (autoSyncInFlight.has(user.id)) return;
      if (autoSyncInFlight.size >= AUTO_SYNC_LIMIT) return;
      const lastRun = autoSyncLastRun.get(user.id);
      if (!force && lastRun && Date.now() - lastRun < AUTO_SYNC_COOLDOWN_MS) return;
      const filteredKeys = monthKeys.filter(Boolean);
      if (filteredKeys.length === 0) return;
      const existing = await prisma.monthlyUserStat.findMany({
        where: { userId: user.id, monthKey: { in: filteredKeys } },
        select: { monthKey: true, updatedAt: true },
      });
      const existingMap = new Map(existing.map((stat) => [stat.monthKey, stat.updatedAt]));
      const keysToSync = filteredKeys.filter((key) => {
        const updatedAt = existingMap.get(key);
        if (!updatedAt) return true;
        return Date.now() - updatedAt.getTime() >= AUTO_SYNC_COOLDOWN_MS;
      });
      if (keysToSync.length === 0) return;
      autoSyncInFlight.add(user.id);
      autoSyncLastRun.set(user.id, Date.now());
      try {
        for (const key of keysToSync) {
          await syncMonthlyUserStatsForMonth({ id: user.id, vid: user.vid }, key);
        }
      } catch (err) {
        console.error("[ivao/callback] auto sync failed", err);
      } finally {
        autoSyncInFlight.delete(user.id);
      }
    };

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "ivao",
          providerAccountId: vid,
        },
      },
      update: {
        userId: user.id,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        expires_at: expiresAt,
        token_type: tokenType ?? null,
        scope: scope ?? null,
      },
      create: {
        userId: user.id,
        type: "oauth",
        provider: "ivao",
        providerAccountId: vid,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        expires_at: expiresAt,
        token_type: tokenType ?? null,
        scope: scope ?? null,
      },
    });

    // Issue session cookie
    const cookie = await createSessionCookie({
      sub: user.id,
      vid: user.vid,
      name: user.name,
      role: user.role as "USER" | "STAFF" | "ADMIN",
      ivaoAccessToken: accessToken,
    });
    const redirectTarget = stripRetryParam(state, appBaseUrl);

    const response = NextResponse.redirect(redirectTarget);
    response.cookies.set({ name: STATE_COOKIE, value: "", path: "/", maxAge: 0 });
    response.cookies.set(cookie);
    if (!existingUser) {
      void scheduleAutoSync(recentMonthKeys(12), true);
    } else {
      void scheduleAutoSync(recentMonthKeys(1));
    }
    return response;
  } catch (err) {
    console.error("[ivao/callback] unhandled error", err);
    await logAuthEvent(`handler_error state=${state} err=${err instanceof Error ? err.message : "unknown"}`);
    return errorRedirect("ivao_auth");
  }
}
