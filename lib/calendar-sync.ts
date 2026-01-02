import { prisma } from "@/lib/prisma";

const CALENDAR_SOURCE = "google-calendar";
const SYNC_INTERVAL_MINUTES = 30;

type ParsedEvent = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime?: Date | null;
};

const normalizeText = (value: string) =>
  value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();

const parseIcsDate = (raw: string): Date | null => {
  const value = raw.trim();
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 0, 0, 0));
  }
  const dateTime = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (dateTime) {
    const [, y, m, d, hh, mm, ss] = dateTime;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)));
  }
  return null;
};

const classifyEventType = (title: string, description?: string | null) => {
  const blob = `${title} ${description ?? ""}`.toLowerCase();
  if (blob.includes("exam") || blob.includes("exame")) return "EXAM";
  if (blob.includes("training") || blob.includes("treino") || blob.includes("instruction")) return "TRAINING";
  return "OTHER";
};

const parseIcsEvents = (text: string): ParsedEvent[] => {
  const rawLines = text.replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }

  const events: ParsedEvent[] = [];
  let current: Partial<ParsedEvent> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.uid && current.title && current.startTime) {
        events.push({
          uid: current.uid,
          title: current.title,
          description: current.description,
          location: current.location,
          startTime: current.startTime,
          endTime: current.endTime ?? null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) continue;
    const value = rest.join(":");
    const key = rawKey.split(";")[0].toUpperCase();

    if (key === "UID") current.uid = normalizeText(value);
    if (key === "SUMMARY") current.title = normalizeText(value);
    if (key === "DESCRIPTION") current.description = normalizeText(value);
    if (key === "LOCATION") current.location = normalizeText(value);
    if (key === "DTSTART") current.startTime = parseIcsDate(value) ?? undefined;
    if (key === "DTEND") current.endTime = parseIcsDate(value) ?? undefined;
  }

  return events;
};

export async function syncCalendarIfStale() {
  const url = process.env.GOOGLE_CALENDAR_ICS_URL;
  if (!url) return { skipped: true, reason: "missing-url" };

  const now = new Date();
  const sync = await prisma.calendarSync.findUnique({ where: { source: CALENDAR_SOURCE } });
  if (sync?.lastSyncedAt) {
    const ageMinutes = (now.getTime() - sync.lastSyncedAt.getTime()) / 60000;
    if (ageMinutes < SYNC_INTERVAL_MINUTES) {
      return { skipped: true, reason: "fresh" };
    }
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      await prisma.calendarSync.upsert({
        where: { source: CALENDAR_SOURCE },
        create: { source: CALENDAR_SOURCE, lastStatus: `fetch-failed:${res.status}` },
        update: { lastStatus: `fetch-failed:${res.status}` },
      });
      return { skipped: true, reason: "fetch-failed" };
    }

    const text = await res.text();
    const parsed = parseIcsEvents(text).filter((event) => event.startTime);
    const uids = parsed.map((event) => event.uid);
    const upserts = parsed.map((event) =>
      prisma.calendarEvent.upsert({
        where: { uid: event.uid },
        create: {
          uid: event.uid,
          title: event.title,
          description: event.description ?? null,
          location: event.location ?? null,
          startTime: event.startTime,
          endTime: event.endTime ?? null,
          type: classifyEventType(event.title, event.description),
          source: CALENDAR_SOURCE,
        },
        update: {
          title: event.title,
          description: event.description ?? null,
          location: event.location ?? null,
          startTime: event.startTime,
          endTime: event.endTime ?? null,
          type: classifyEventType(event.title, event.description),
          source: CALENDAR_SOURCE,
        },
      }),
    );

    if (upserts.length) {
      await prisma.$transaction(upserts);
    }

    const cleanupBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    await prisma.calendarEvent.deleteMany({
      where: {
        source: CALENDAR_SOURCE,
        uid: { notIn: uids.length ? uids : ["__none__"] },
        startTime: { gte: cleanupBefore },
      },
    });

    await prisma.calendarSync.upsert({
      where: { source: CALENDAR_SOURCE },
      create: { source: CALENDAR_SOURCE, lastSyncedAt: now, lastStatus: "ok" },
      update: { lastSyncedAt: now, lastStatus: "ok" },
    });

    return { success: true, count: parsed.length };
  } catch (error) {
    await prisma.calendarSync.upsert({
      where: { source: CALENDAR_SOURCE },
      create: { source: CALENDAR_SOURCE, lastStatus: "error" },
      update: { lastStatus: "error" },
    });
    return { skipped: true, reason: error instanceof Error ? error.message : "unknown" };
  }
}
