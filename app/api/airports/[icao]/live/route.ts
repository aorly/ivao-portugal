"use server";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ivaoClient } from "@/lib/ivaoClient";
import { fetchMetarTaf } from "@/lib/weather";

const parseCoord = (val: unknown) => {
  if (val == null) return NaN;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(",", ".");
    const num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }
  return NaN;
};

const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getFlightState = (flight: any): string | undefined => {
  const base = flight?.state ?? flight?.status ?? flight?.phase ?? flight?.flightPhase;
  const lastTrack = flight?.lastTrack;
  const trackState = lastTrack?.state ?? lastTrack?.phase ?? lastTrack?.groundState;
  const cleaned = typeof (base ?? trackState) === "string" ? (base ?? trackState)!.trim() : undefined;
  if (cleaned) return cleaned;

  const onGround = typeof lastTrack?.onGround === "boolean" ? lastTrack.onGround : undefined;
  const groundSpeed =
    typeof lastTrack?.groundSpeed === "number"
      ? lastTrack.groundSpeed
      : typeof flight?.groundSpeed === "number"
        ? flight.groundSpeed
        : undefined;

  if (onGround) {
    if (groundSpeed && groundSpeed > 10) return "Taxi";
    return "On Stand";
  }

  return "En Route";
};

export async function GET(_req: Request, { params }: { params: { icao: string } }) {
  const icao = params.icao?.toUpperCase();
  if (!icao) return NextResponse.json({ error: "Missing ICAO" }, { status: 400 });

  const airport = await prisma.airport.findUnique({
    where: { icao },
    include: { stands: true },
  });
  if (!airport) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const whazzup = await ivaoClient.getWhazzup().catch(() => null);
  const flightsRawFallback = await ivaoClient.getFlights().catch(() => []);
  const planesRaw =
    (whazzup as any)?.clients?.pilots ??
    (whazzup as any)?.pilots ??
    (Array.isArray(whazzup) ? whazzup : []);

  const planesParsed = (data: any[]) =>
    data
      .map((p: any) => ({
        lat: parseCoord(
          p?.lastTrack?.latitude ??
            p?.location?.latitude ??
            p?.location?.lat ??
            p?.position?.latitude ??
            p?.position?.lat ??
            p?.latitude ??
            p?.lat ??
            p?.latitud,
        ),
        lon: parseCoord(
          p?.lastTrack?.longitude ??
            p?.location?.longitude ??
            p?.location?.lon ??
            p?.position?.longitude ??
            p?.position?.lon ??
            p?.longitude ??
            p?.lon ??
            p?.longitud,
        ),
        dep: (p?.flightPlan?.departureId ?? p?.flight_plan?.departureId ?? p?.departure ?? p?.dep ?? p?.origin ?? "").toUpperCase(),
        arr: (p?.flightPlan?.arrivalId ?? p?.flight_plan?.arrivalId ?? p?.arrival ?? p?.dest ?? p?.destination ?? "").toUpperCase(),
        callsign: (p?.callsign ?? "").toUpperCase(),
        aircraft: p?.flightPlan?.aircraftId ?? p?.flight_plan?.aircraftId ?? p?.aircraftType ?? p?.aircraft ?? "",
        state: getFlightState(p),
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  const planesWhazzup = Array.isArray(planesRaw) ? planesParsed(planesRaw) : [];
  const planesFlights = Array.isArray(flightsRawFallback) ? planesParsed(flightsRawFallback as any[]) : [];
  const planes = planesWhazzup.length > 0 ? planesWhazzup : planesFlights;
  const inbound = planes.filter((p) => p.arr === icao);
  const outbound = planes.filter((p) => p.dep === icao);

  const standsWithOcc = airport.stands.map((stand) => {
    const distances = planes.map((p) => haversineMeters(stand.lat, stand.lon, p.lat, p.lon));
    const min = distances.length ? Math.min(...distances) : Infinity;
    const occupied = min < 40;
    const occupant =
      occupied && planes.length
        ? planes.reduce(
            (best, p) => {
              const d = haversineMeters(stand.lat, stand.lon, p.lat, p.lon);
              return d < best.dist ? { dist: d, plane: p } : best;
            },
            { dist: Infinity, plane: null as any },
          ).plane
        : null;
    return {
      id: stand.id,
      name: stand.name,
      lat: stand.lat,
      lon: stand.lon,
      occupied,
      occupant: occupant
        ? { callsign: occupant.callsign, aircraft: occupant.aircraft }
        : null,
    };
  });

  const center = (() => {
    if (standsWithOcc.length === 0 && airport.latitude && airport.longitude) return { lat: airport.latitude, lon: airport.longitude };
    if (standsWithOcc.length === 0) return null;
    const lat = standsWithOcc.reduce((sum, s) => sum + s.lat, 0) / standsWithOcc.length;
    const lon = standsWithOcc.reduce((sum, s) => sum + s.lon, 0) / standsWithOcc.length;
    return { lat, lon };
  })();

  const clientsObj = (whazzup as any)?.clients ?? {};
  const candidateArrays: any[] = [
    clientsObj.atc,
    clientsObj.controllers,
    clientsObj.controlers,
    (whazzup as any)?.atc,
    (whazzup as any)?.controllers,
    (whazzup as any)?.controlers,
    Array.isArray(whazzup) ? whazzup : null,
    ...Object.values(clientsObj ?? {}).filter(Array.isArray),
  ].filter(Boolean) as any[];
  const atcRaw = candidateArrays.flat().filter(Boolean);
  const onlineAtc = Array.isArray(atcRaw)
    ? atcRaw
        .map((c: any) => {
          const lat = Number(
            c?.location?.latitude ??
              c?.location?.lat ??
              c?.position?.latitude ??
              c?.position?.lat ??
              c?.latitude ??
              c?.lat ??
              NaN,
          );
          const lon = Number(
            c?.location?.longitude ??
              c?.location?.lon ??
              c?.position?.longitude ??
              c?.position?.lon ??
              c?.longitude ??
              c?.lon ??
              NaN,
          );
          const callsign = (c?.callsign ?? c?.station ?? "").toUpperCase();
          const matchesCallsign = callsign.includes(icao);
          const hasPos = typeof lat === "number" && typeof lon === "number" && center;
          const distance = hasPos ? haversineMeters(center!.lat, center!.lon, lat as number, lon as number) : null;
          const closeEnough = hasPos && distance !== null ? distance <= 18520 : false; // ~10nm
          if (!matchesCallsign && !closeEnough) return null;
          return {
            callsign: c?.callsign ?? c?.station ?? "ATC",
            frequency: c?.frequency ?? c?.freq ?? "",
          };
        })
        .filter(Boolean)
    : [];

  const weather = await fetchMetarTaf(icao).catch(() => null);
  const metar = weather?.metar ?? null;
  const taf = weather?.taf ?? null;

  return NextResponse.json({
    metar,
    taf,
    stands: standsWithOcc,
    inbound,
    outbound,
    atc: onlineAtc,
  });
}
