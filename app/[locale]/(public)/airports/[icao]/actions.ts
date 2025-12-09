"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fetchMetarTaf } from "@/lib/weather";
import { type Locale } from "@/i18n";

export async function refreshWeather(icao: string, locale: Locale) {
  const airport = await prisma.airport.findUnique({ where: { icao: icao.toUpperCase() } });
  if (!airport) {
    throw new Error("Airport not found");
  }

  const weather = await fetchMetarTaf(airport.icao);
  await prisma.weatherLog.create({
    data: {
      airportId: airport.id,
      rawMetar: weather.metar ?? "",
      rawTaf: weather.taf ?? null,
      timestamp: new Date(),
    },
  });

  revalidatePath(`/${locale}/airports/${airport.icao.toLowerCase()}`);
}
