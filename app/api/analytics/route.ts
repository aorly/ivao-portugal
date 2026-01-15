import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const MAX_LENGTH = 500;
const ALLOWED_EVENTS = new Set(["page_view", "cta_click"]);

const sanitize = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_LENGTH);
};

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|crawling/i.test(userAgent)) {
    return NextResponse.json({ ok: true });
  }

  let body: Record<string, unknown> | null = null;
  try {
    const raw = (await request.json()) as unknown;
    body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventType = sanitize(body?.eventType);
  const path = sanitize(body?.path);
  if (!eventType || !path || !ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const session = await auth();
  const userId = session?.user?.id ?? undefined;

  await prisma.analyticsEvent.create({
    data: {
      eventType,
      path,
      locale: sanitize(body?.locale),
      label: sanitize(body?.label),
      href: sanitize(body?.href),
      title: sanitize(body?.title),
      referrer: sanitize(body?.referrer),
      sessionId: sanitize(body?.sessionId),
      userId,
    },
  });

  return NextResponse.json({ ok: true });
}
