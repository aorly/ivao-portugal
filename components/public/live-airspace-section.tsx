"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AirportTimetable } from "@/components/public/airport-timetable";
import { BookStationModal } from "@/components/public/book-station-modal";
import { Button } from "@/components/ui/button";

type AirportOption = { icao: string; name?: string | null };
type Labels = {
  choose: string;
  button: string;
  inbound: string;
  outbound: string;
  empty: string;
  loading: string;
  error: string;
  updated: string;
};

type MapTargets = {
  mainland: { x: number; y: number; width: number; height: number };
  azores: { x: number; y: number; width: number; height: number };
  madeira: { x: number; y: number; width: number; height: number };
};

type InsetRect = { x: number; y: number; width: number; height: number };
type Connector = { from: { x: number; y: number }; to: { x: number; y: number } };

type MapNode = {
  code: string;
  label: string;
  isActive: boolean;
  x: number;
  y: number;
  labelOffset?: { x?: number; y?: number };
};

type ExtraAirport = {
  code: string;
  name: string;
  isActive: boolean;
  x: number;
  y: number;
};

type AtcNode = { id: string; callsign: string; icao: string | null; x: number; y: number };
type FlightConnection = { id: string; from: { x: number; y: number }; to: { x: number; y: number } };

type LiveAtcEntry = { callsign: string; icao?: string; frequency: string | null };
type BookingAction = (formData: FormData) => Promise<{ success?: boolean; error?: string }>;
type BookingStation = { code: string; label: string };

type Props = {
  locale: string;
  labels: Labels;
  airports: AirportOption[];
  title: string;
  description: string;
  ctaLabel: string;
  fallbackLabel: string;
  atcLabel: string;
  bookingsTitle: string;
  bookingsEmpty: string;
  bookings: { id: string; callsign: string; icao?: string | null; window: string }[];
  bookingAction?: BookingAction;
  bookingStations?: BookingStation[];
  bookingStartDefault?: string;
  bookingEndDefault?: string;
  bookingMaxToday?: string;
  bookingGuestHint?: string;
  isAuthed?: boolean;
  refreshIntervalMs?: number;
  mapTargets: MapTargets;
  azoresInsetRect: InsetRect;
  madeiraInsetRect: InsetRect;
  insetConnectors: Connector[];
  mainlandTransform: string;
  azoresTransform: string;
  madeiraTransform: string;
  mainlandPaths: string[];
  azoresPaths: string[];
  madeiraPaths: string[];
  flightConnections: FlightConnection[];
  mapNodes: MapNode[];
  extraAirports: ExtraAirport[];
  atcNodes: AtcNode[];
  atcList: LiveAtcEntry[];
};

export function LiveAirspaceSection({
  locale,
  labels,
  airports,
  title,
  description,
  ctaLabel,
  fallbackLabel,
  atcLabel,
  mapTargets,
  azoresInsetRect,
  madeiraInsetRect,
  insetConnectors,
  mainlandTransform,
  azoresTransform,
  madeiraTransform,
  mainlandPaths,
  azoresPaths,
  madeiraPaths,
  flightConnections,
  mapNodes,
  extraAirports,
  atcNodes,
  atcList,
  bookings,
  bookingsTitle,
  bookingsEmpty,
  bookingAction,
  bookingStations,
  bookingStartDefault,
  bookingEndDefault,
  bookingMaxToday,
  bookingGuestHint,
  isAuthed = false,
  refreshIntervalMs = 60000,
}: Props) {
  const router = useRouter();
  const [selectedIcao, setSelectedIcao] = useState(airports[0]?.icao ?? "");
  const airportLookup = useMemo(() => new Set(airports.map((airport) => airport.icao)), [airports]);
  const canBook =
    Boolean(bookingAction) &&
    Boolean(bookingStations?.length) &&
    Boolean(bookingStartDefault) &&
    Boolean(bookingEndDefault) &&
    Boolean(bookingMaxToday);

  useEffect(() => {
    if (!refreshIntervalMs) return undefined;
    const timer = setInterval(() => {
      router.refresh();
    }, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs, router]);

  return (
    <section className="rounded-[32px] bg-[color:var(--surface-2)] my-12 p-8 sm:my-14 sm:p-10 lg:my-16 lg:p-16">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[color:var(--text-primary)]">{title}</h2>
            <p className="text-sm text-[color:var(--text-muted)]">{description}</p>
          </div>
          <div className="w-full max-w-xl rounded-2xl border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-5 py-4 text-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--danger-strong)]">{atcLabel}</p>
            {atcList.length === 0 ? (
              <p className="mt-2 text-base text-[color:var(--text-muted)]">{fallbackLabel}</p>
            ) : (
              <div className="mt-3 grid gap-3">
                {atcList.slice(0, 6).map((entry) => (
                  <div key={entry.callsign} className="flex items-center justify-between text-[color:var(--text-primary)]">
                    <span className="flex items-center gap-2 text-base font-semibold">
                      <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--danger)] shadow-[0_0_10px_rgba(233,52,52,0.6)]" />
                      {entry.callsign}
                    </span>
                    <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--danger-strong)]">
                      {entry.icao ?? "ATC"} • {entry.frequency ?? "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-xs">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
              {bookingsTitle}
            </p>
            {bookings.length === 0 ? (
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">{bookingsEmpty}</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {bookings.slice(0, 6).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between text-[color:var(--text-primary)]"
                  >
                    <span className="text-sm font-semibold">{booking.callsign}</span>
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      {booking.icao ?? "LP"} • {booking.window}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {canBook ? (
              <div className="mt-3">
                {isAuthed ? (
                  <BookStationModal
                    action={bookingAction!}
                    stations={bookingStations!}
                    bookingStartDefault={bookingStartDefault!}
                    bookingEndDefault={bookingEndDefault!}
                    bookingMaxToday={bookingMaxToday!}
                  />
                ) : bookingGuestHint ? (
                  <div className="flex items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-2)] px-3 py-2 text-[11px] uppercase tracking-[0.1em]">
                    <span>Want to control?</span>
                    <span className="font-semibold text-[color:var(--text-primary)]">{bookingGuestHint}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <Link href={`/${locale}/airports`}>
            <Button
              variant="secondary"
              className="border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:border-[color:var(--primary)]"
            >
              {ctaLabel}
            </Button>
          </Link>
        </div>
        <div className="relative h-[280px] sm:h-[360px] lg:h-[420px]">
          <div className="absolute inset-0 z-0">
            <svg
              className="absolute inset-0 h-full w-full opacity-85 pointer-events-auto"
              viewBox="0 0 100 100"
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="all"
            >
              <defs>
                <filter id="airport-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
                </filter>
              </defs>
              <rect
                x={azoresInsetRect.x}
                y={azoresInsetRect.y}
                width={azoresInsetRect.width}
                height={azoresInsetRect.height}
                rx="2"
                fill="rgba(44,107,216,0.08)"
                stroke="var(--primary)"
                strokeOpacity="0.5"
                strokeWidth="0.45"
                strokeDasharray="2 2.5"
              />
              <text
                x={mapTargets.azores.x + 1.2}
                y={mapTargets.azores.y + 2.8}
                fill="rgba(44,72,140,0.65)"
                fontSize="2.6"
                fontWeight="600"
                letterSpacing="0.8"
              >
                AZORES
              </text>
              <rect
                x={madeiraInsetRect.x}
                y={madeiraInsetRect.y}
                width={madeiraInsetRect.width}
                height={madeiraInsetRect.height}
                rx="2"
                fill="rgba(44,107,216,0.08)"
                stroke="var(--primary)"
                strokeOpacity="0.5"
                strokeWidth="0.45"
                strokeDasharray="2 2.5"
              />
              <text
                x={mapTargets.madeira.x + 1.1}
                y={mapTargets.madeira.y + 2.6}
                fill="rgba(44,72,140,0.65)"
                fontSize="2.4"
                fontWeight="600"
                letterSpacing="0.8"
              >
                MADEIRA
              </text>
              {insetConnectors.map((connector, idx) => (
                <line
                  key={`inset-${idx}`}
                  x1={connector.from.x}
                  y1={connector.from.y}
                  x2={connector.to.x}
                  y2={connector.to.y}
                  stroke="var(--primary)"
                  strokeOpacity="0.5"
                  strokeWidth="0.35"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="2 3"
                />
              ))}
              <g transform={mainlandTransform}>
                {mainlandPaths.map((path, idx) => (
                  <path
                    key={`mainland-${idx}`}
                    d={path}
                    fill="rgba(44,107,216,0.18)"
                    stroke="var(--primary)"
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              <g transform={azoresTransform}>
                {azoresPaths.map((path, idx) => (
                  <path
                    key={`azores-${idx}`}
                    d={path}
                    fill="rgba(44,107,216,0.18)"
                    stroke="var(--primary)"
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              <g transform={madeiraTransform}>
                {madeiraPaths.map((path, idx) => (
                  <path
                    key={`madeira-${idx}`}
                    d={path}
                    fill="rgba(44,107,216,0.18)"
                    stroke="var(--primary)"
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
              {flightConnections.map((connection, idx) => {
                const pathId = `flight-path-${idx}`;
                return (
                  <g key={`flight-${connection.id}`}>
                    <path
                      id={pathId}
                      d={`M${connection.from.x},${connection.from.y} L${connection.to.x},${connection.to.y}`}
                      stroke="rgba(24,86,179,0.9)"
                      strokeOpacity="0.9"
                      strokeWidth="0.75"
                      vectorEffect="non-scaling-stroke"
                      strokeDasharray="3 2"
                    />
                    <g>
                      <path
                        d="M0,-1.2 L2.4,0 L0,1.2 L0.5,0 Z"
                        fill="rgba(24,86,179,0.92)"
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth="0.15"
                      />
                      <animateMotion dur="22s" repeatCount="indefinite" rotate="auto" begin={`${idx * 1.2}s`}>
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                    </g>
                  </g>
                );
              })}
              {mapNodes.map((node) => {
                const offset = node.labelOffset ?? {};
                const labelX = node.x + (offset.x ?? 0);
                const labelY = node.y + (offset.y ?? 0);
                const activeColor = "var(--danger)";
                const outerRadius = node.isActive ? 3 : 1;
                const innerRadius = node.isActive ? 1.8 : 0.6;
                return (
                  <g
                    key={node.code}
                    className="group cursor-pointer"
                    onClick={() => {
                      if (airportLookup.has(node.code)) {
                        setSelectedIcao(node.code);
                      }
                    }}
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={outerRadius}
                      fill={node.isActive ? activeColor : "var(--primary)"}
                      opacity={node.isActive ? 0.75 : 0.65}
                      filter="url(#airport-blur)"
                    >
                      {node.isActive ? (
                        <animate attributeName="opacity" values="0.25;0.9;0.25" dur="1.6s" repeatCount="indefinite" />
                      ) : null}
                    </circle>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={innerRadius}
                      fill={node.isActive ? activeColor : "var(--primary)"}
                      opacity={node.isActive ? 0.9 : 0.75}
                    />
                    {node.isActive ? (
                      <g className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <rect
                          x={labelX - 7.2}
                          y={labelY - 6.2}
                          width="14.4"
                          height="7.6"
                          rx="1"
                          fill="rgba(11,19,36,0.78)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.2"
                        />
                        <text
                          x={labelX}
                          y={labelY - 3.4}
                          fontSize="2.2"
                          fontWeight="600"
                          letterSpacing="0.6"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.65)"
                        >
                          {node.label}
                        </text>
                        <text
                          x={labelX}
                          y={labelY - 1}
                          fontSize="2.6"
                          fontWeight="700"
                          letterSpacing="0.8"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.9)"
                        >
                          {node.code}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
              {extraAirports.map((airport) => {
                const name = airport.name.trim();
                const displayName = name.length > 18 ? `${name.slice(0, 18)}...` : name;
                const labelWidth = Math.min(26, Math.max(11, Math.max(displayName.length, airport.code.length) * 1.1 + 4));
                const labelX = airport.x + 1.6;
                const labelY = airport.y - 7;
                const activeColor = "var(--danger)";
                const outerRadius = airport.isActive ? 1.1 : 0.35;
                const innerRadius = airport.isActive ? 0.9 : 0.3;
                return (
                  <g
                    key={`extra-${airport.code}`}
                    className="group cursor-pointer"
                    onClick={() => {
                      if (airportLookup.has(airport.code)) {
                        setSelectedIcao(airport.code);
                      }
                    }}
                  >
                    {airport.isActive ? (
                      <circle cx={airport.x} cy={airport.y} r="1.4" fill={activeColor} opacity="0.5" filter="url(#airport-blur)">
                        <animate attributeName="opacity" values="0.25;0.55;0.25" dur="2.2s" repeatCount="indefinite" />
                      </circle>
                    ) : null}
                    <circle
                      cx={airport.x}
                      cy={airport.y}
                      r={outerRadius}
                      fill={airport.isActive ? activeColor : "var(--primary)"}
                      opacity={airport.isActive ? 0.8 : 0.6}
                    />
                    <circle
                      cx={airport.x}
                      cy={airport.y}
                      r={innerRadius}
                      fill={airport.isActive ? activeColor : "var(--primary)"}
                      opacity={airport.isActive ? 0.9 : 0.7}
                    />
                    {airport.isActive ? (
                      <g className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <rect
                          x={labelX}
                          y={labelY}
                          width={labelWidth}
                          height="8"
                          rx="1"
                          fill="rgba(11,19,36,0.75)"
                          stroke="rgba(255,255,255,0.12)"
                          strokeWidth="0.2"
                        />
                        <text
                          x={labelX + labelWidth / 2}
                          y={labelY + 3.2}
                          fontSize="2.1"
                          fontWeight="600"
                          letterSpacing="0.5"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.65)"
                        >
                          {displayName}
                        </text>
                        <text
                          x={labelX + labelWidth / 2}
                          y={labelY + 6.2}
                          fontSize="2.4"
                          fontWeight="700"
                          letterSpacing="0.6"
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.9)"
                        >
                          {airport.code}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
              {atcNodes.map((atc) => (
                <g key={`atc-${atc.id}`}>
                  <circle cx={atc.x} cy={atc.y} r="1.6" fill="var(--info)" opacity="0.7">
                    <animate attributeName="opacity" values="0.25;0.8;0.25" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </div>
      <div className="mt-10">
        <AirportTimetable
          airports={airports}
          labels={labels}
          allowPicker
          selectedIcao={selectedIcao}
          onSelectIcao={setSelectedIcao}
        />
      </div>
    </section>
  );
}
