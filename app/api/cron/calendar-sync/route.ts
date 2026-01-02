import { NextRequest, NextResponse } from "next/server";
import { syncCalendarIfStale } from "@/lib/calendar-sync";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const secret = process.env.CRON_SECRET;

  if (!secret || token !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncCalendarIfStale();
  return NextResponse.json({ ok: true, result });
}
