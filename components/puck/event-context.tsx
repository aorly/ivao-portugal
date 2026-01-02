"use client";

import { createContext, useContext } from "react";

export type EventLayoutData = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  description: string;
  bannerUrl?: string | null;
  startIso: string;
  endIso: string;
  startLabel: string;
  endLabel: string;
  timeframe: string;
  statusLabel: string;
  updatedLabel?: string | null;
  updatedIso?: string | null;
  airports: string[];
  firs: string[];
  divisions: string[];
  eventType?: string | null;
  infoUrl?: string | null;
  hqeAward?: boolean;
  routes?: string | null;
  registrations: { id: string; name: string }[];
  registrationsCount: number;
  eventUrl: string;
  eventLocation: string;
  isRegistered: boolean;
  registerLabel: string;
  unregisterLabel: string;
};

const EventContext = createContext<EventLayoutData | null>(null);

export const EventProvider = EventContext.Provider;

export function useEventContext() {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error("EventContext is missing");
  }
  return ctx;
}