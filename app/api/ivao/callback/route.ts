import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "/";

  if (!code) {
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
      return errorRedirect("ivao_auth");
    }

    const tokens = (await tokenRes.json()) as { access_token: string };
    accessToken = tokens.access_token;
  } catch (err) {
    console.error("[ivao/callback] token exchange error", err);
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
      return errorRedirect("ivao_profile");
    }
    profile = (await profileRes.json()) as typeof profile;
  } catch (err) {
    console.error("[ivao/callback] userinfo error", err);
    return errorRedirect("ivao_profile");
  }

  const rawVid = profile.vid ?? profile.id ?? profile.sub ?? profile.username ?? "unknown";
  const vid = String(rawVid);
  const name = String(profile.fullName ?? profile.name ?? profile.username ?? vid);
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

  // Issue session cookie
  const cookie = await createSessionCookie({
    sub: user.id,
    vid: user.vid,
    name: user.name,
    role: user.role,
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
