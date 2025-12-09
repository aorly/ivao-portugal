import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale");
  const redirectTo = searchParams.get("redirect") || "/";

  if (!locale) {
    return NextResponse.redirect(redirectTo);
  }

  const res = NextResponse.redirect(redirectTo);
  res.cookies.set("preferred_locale", locale, { path: "/", httpOnly: false, sameSite: "lax" });
  return res;
}
