"use client";

import { createContext, useContext } from "react";

export type AirportLayoutLabels = {
  choose: string;
  button: string;
  inbound: string;
  outbound: string;
  empty: string;
  loading: string;
  error: string;
  updated: string;
};

export type AirportLayoutData = {
  locale: string;
  icao: string;
  name: string;
  labels: AirportLayoutLabels;
};

const AirportContext = createContext<AirportLayoutData | null>(null);

export const AirportProvider = AirportContext.Provider;

export function useAirportContext() {
  const ctx = useContext(AirportContext);
  if (!ctx) {
    throw new Error("AirportContext is missing");
  }
  return ctx;
}
