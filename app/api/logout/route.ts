import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

function safeCallback(callbackUrl: string | null, appBaseUrl: string) {
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
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const safeCallbackUrl = safeCallback(callbackUrl, appBaseUrl);

  await destroySession();

  return NextResponse.redirect(`${appBaseUrl}${safeCallbackUrl}`);
}
