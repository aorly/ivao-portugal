import { NextResponse } from "next/server";

// IVAO OIDC authorize endpoint (from well-known): https://sso.ivao.aero/authorize
const DEFAULT_AUTHORIZE = "https://sso.ivao.aero/authorize";

function safeCallback(callbackUrl: string | null, appBaseUrl: string) {
  // Allow only same-origin paths to avoid open redirects
  if (!callbackUrl) return "/";
  try {
    const base = new URL(appBaseUrl);
    const target = new URL(callbackUrl, base);
    if (target.origin === base.origin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    // ignore parse errors
  }
  return "/";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get("callbackUrl");

  const clientId = process.env.IVAO_CLIENT_ID;
  const authorize = process.env.IVAO_OAUTH_AUTHORIZE ?? DEFAULT_AUTHORIZE;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const safeCallbackUrl = safeCallback(callbackUrl, appBaseUrl);

  if (!clientId) {
    return NextResponse.json({ error: "IVAO_CLIENT_ID missing" }, { status: 500 });
  }

  const redirectUri = `${appBaseUrl}/api/ivao/callback`;
  const scope = process.env.IVAO_OAUTH_SCOPE ?? "openid profile email";

  const authorizeUrl = new URL(authorize);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", scope);
  authorizeUrl.searchParams.set("state", safeCallbackUrl);

  return NextResponse.redirect(authorizeUrl.toString());
}
