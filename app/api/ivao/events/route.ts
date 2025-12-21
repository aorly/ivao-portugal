"use server";

import { NextResponse } from "next/server";
import { ivaoClient } from "@/lib/ivaoClient";

const DIVISION_CODE = process.env.DIVISION_CODE?.toUpperCase() || "PT";
const API_BASE = process.env.IVAO_API_BASE ?? "https://api.ivao.aero";
const API_KEY = process.env.IVAO_API_KEY;

const normalizeArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray((value as { data?: unknown[] }).data)) return (value as { data?: unknown[] }).data ?? [];
  return [];
};

const stringOrNull = (value: unknown) => (typeof value === "string" ? value : null);

async function fetchRawEvents(division: string) {
  const url = new URL(`${API_BASE}/v1/events`);
  if (division) url.searchParams.set("division", division);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(API_KEY ? { apiKey: API_KEY, "X-API-Key": API_KEY } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`IVAO events fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const division = url.searchParams.get("division")?.toUpperCase() || DIVISION_CODE;

  const payload = await fetchRawEvents(division).catch(async (err) => {
    console.error("[ivao-events] fetch failed", err);
    // Fallback to client helper (keeps compatibility if headers differ)
    return ivaoClient.getEvents().catch(() => []);
  });

  const eventsArray = normalizeArray(
    (payload as { events?: unknown })?.events ??
      (payload as { result?: unknown })?.result ??
      payload,
  );

  const filtered = eventsArray
    .map((raw) => {
      const airports = normalizeArray((raw as { airports?: unknown }).airports ?? (raw as { aerodromes?: unknown }).aerodromes)
        .map((a) => stringOrNull((a as { icao?: unknown }).icao ?? (a as { code?: unknown }).code))
        .filter(Boolean) as string[];

      const divisions = normalizeArray((raw as { divisions?: unknown }).divisions ?? (raw as { division?: unknown }).division)
        .map((d) => stringOrNull(d as string | null))
        .filter(Boolean) as string[];

      const isDivisionMatch =
        divisions.length === 0 ||
        divisions.some((d) => d?.toUpperCase() === division) ||
        stringOrNull((raw as { division?: unknown }).division)?.toUpperCase() === division;

      if (!isDivisionMatch) return null;

      const start =
        stringOrNull((raw as { start?: unknown }).start) ??
        stringOrNull((raw as { startDate?: unknown }).startDate) ??
        stringOrNull((raw as { startTime?: unknown }).startTime) ??
        stringOrNull((raw as { start_at?: unknown }).start_at) ??
        stringOrNull((raw as { start_date?: unknown }).start_date);
      const end =
        stringOrNull((raw as { end?: unknown }).end) ??
        stringOrNull((raw as { endDate?: unknown }).endDate) ??
        stringOrNull((raw as { endTime?: unknown }).endTime) ??
        stringOrNull((raw as { end_at?: unknown }).end_at) ??
        stringOrNull((raw as { end_date?: unknown }).end_date);

      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;

      return {
        id: stringOrNull((raw as { id?: unknown }).id) ?? stringOrNull((raw as { uuid?: unknown }).uuid) ?? crypto.randomUUID(),
        title: stringOrNull((raw as { title?: unknown }).title) ?? stringOrNull((raw as { name?: unknown }).name) ?? "IVAO Event",
        description:
          stringOrNull((raw as { description?: unknown }).description) ??
          stringOrNull((raw as { briefing?: unknown }).briefing) ??
          null,
        bannerUrl:
          stringOrNull((raw as { banner?: unknown }).banner) ??
          stringOrNull((raw as { bannerUrl?: unknown }).bannerUrl) ??
          stringOrNull((raw as { imageUrl?: unknown }).imageUrl) ??
          stringOrNull((raw as { image_url?: unknown }).image_url),
        startTime: startDate?.toISOString() ?? null,
        endTime: endDate?.toISOString() ?? null,
        airports,
      };
    })
    .filter((e) => e && e.startTime && e.endTime) as {
    id: string;
    title: string;
    description: string | null;
    bannerUrl: string | null;
    startTime: string;
    endTime: string;
    airports: string[];
  }[];

  return NextResponse.json({ division, count: filtered.length, events: filtered });
}
