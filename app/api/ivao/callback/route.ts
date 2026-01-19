import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appendFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "/";

  if (!code) {
    await logAuthEvent(`missing_code state=${state}`);
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokenUrl = process.env.IVAO_OAUTH_TOKEN ?? "https://api.ivao.aero/v2/oauth/token";
  const clientId = process.env.IVAO_CLIENT_ID;
  const clientSecret = process.env.IVAO_CLIENT_SECRET;
  const apiKey = process.env.IVAO_API_KEY;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const redirectUri = `${appBaseUrl}/api/ivao/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "IVAO client credentials missing" }, { status: 500 });
  }

  const localeFromState = (() => {
    const match = state.match(/^\/([a-zA-Z-]{2,5})\//);
    return match?.[1] ?? "en";
  })();
  const errorRedirect = (reason: string) =>
    NextResponse.redirect(`${appBaseUrl}/${localeFromState}/login?error=${encodeURIComponent(reason)}`);

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
  let redirectTarget = `${appBaseUrl}/`;
  if (state) {
    try {
      const base = new URL(appBaseUrl);
      const target = new URL(state, base);
      if (target.origin === base.origin) {
        redirectTarget = `${base.origin}${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // Ignore parse errors and fall back to app base URL
    }
  }

  const response = NextResponse.redirect(redirectTarget);
  response.cookies.set(cookie);
  return response;
}
