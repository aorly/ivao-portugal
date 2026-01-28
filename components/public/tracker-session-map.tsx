"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { PathLayer, ScatterplotLayer, PolygonLayer } from "@deck.gl/layers";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type TrackPoint = {
  lat: number;
  lon: number;
  alt?: number | null;
  onGround?: boolean | null;
  timestamp?: string | null;
};

type Boundary = {
  id: string;
  label: string;
  points: { lat: number; lon: number }[];
};

type Props = {
  points: TrackPoint[];
  boundaries?: Boundary[];
  className?: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const toLngLatAlt = (point: TrackPoint, scale: number) => {
  const altMeters = Number.isFinite(point.alt ?? null) ? (point.alt ?? 0) * 0.3048 : 0;
  return [point.lon, point.lat, altMeters * scale] as [number, number, number];
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

const offsetPoint = (lat: number, lon: number, bearing: number, distanceDegrees: number) => {
  const bearingRad = toRadians(bearing);
  const latOffset = Math.cos(bearingRad) * distanceDegrees;
  const lonOffset = Math.sin(bearingRad) * distanceDegrees;
  return { lat: lat + latOffset, lon: lon + lonOffset };
};

type MapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

const getViewState = (points: TrackPoint[], boundaries: Boundary[]): MapViewState => {
  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const boundaryPoints = boundaries
    .flatMap((boundary) => boundary.points)
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const allPoints = [
    ...valid.map((p) => ({ lat: p.lat, lon: p.lon })),
    ...boundaryPoints,
  ];
  const hasTrack = valid.length > 0;
  if (allPoints.length === 0) {
    return { longitude: 0, latitude: 0, zoom: 1.2, pitch: 55, bearing: -10 };
  }
  const lats = allPoints.map((p) => p.lat);
  const lons = allPoints.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const spread = Math.max(maxLat - minLat, maxLon - minLon);
  const zoom = clamp(9.2 - Math.log2(spread + 1), 5, 12.2);
  const cameraBearing = 0;
  const offset = spread * 0.25;
  const offsetTarget = offsetPoint(centerLat, centerLon, cameraBearing + 180, offset || 0.4);
  return {
    longitude: offsetTarget.lon,
    latitude: offsetTarget.lat,
    zoom,
    pitch: hasTrack ? 78 : 45,
    bearing: hasTrack ? cameraBearing : 0,
  };
};

const phaseColor = (altFt: number, deltaFt: number) => {
  if (altFt < 1000) return [34, 197, 94, 210];
  if (deltaFt > 80) return [56, 189, 248, 210];
  if (deltaFt < -80) return [249, 115, 22, 210];
  return [37, 99, 235, 210];
};

export function TrackerSessionMap({ points, boundaries = [], className }: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const [animationIndex, setAnimationIndex] = useState(0);
  const viewState = useMemo(() => getViewState(points, boundaries), [points, boundaries]);
  const altitudeScale = 2.2;
  const segments = useMemo(() => {
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (valid.length < 2) return [];
    const simplified: TrackPoint[] = [];
    for (let i = 0; i < valid.length; i += 1) {
      const point = valid[i];
      const next = valid[i + 1];
      const isGroundSegment = point.onGround && next?.onGround;
      if (isGroundSegment && i % 5 !== 0) continue;
      simplified.push(point);
    }
    if (simplified.length < 2) return [];
    return simplified.slice(0, -1).map((point, index) => {
      const next = simplified[index + 1];
      const altFt = Number.isFinite(point.alt ?? null) ? (point.alt ?? 0) : 0;
      const nextAltFt = Number.isFinite(next.alt ?? null) ? (next.alt ?? 0) : altFt;
      const deltaFt = nextAltFt - altFt;
      return {
        path: [toLngLatAlt(point, altitudeScale), toLngLatAlt(next, altitudeScale)],
        color: phaseColor(altFt, deltaFt),
        vertical: [
          [point.lon, point.lat, 0],
          toLngLatAlt(point, altitudeScale),
        ] as [number, number, number][],
      };
    });
  }, [points, altitudeScale]);

  const animatedPath = useMemo(() => {
    if (segments.length === 0) return [];
    return segments.map((segment) => segment.path[0]);
  }, [segments]);

  useEffect(() => {
    if (animatedPath.length === 0) return;
    const interval = window.setInterval(() => {
      setAnimationIndex((prev) => (prev + 1) % animatedPath.length);
    }, 300);
    return () => window.clearInterval(interval);
  }, [animatedPath.length]);

  const groundPath = useMemo(() => {
    const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    if (valid.length < 2) return [];
    const simplified: TrackPoint[] = [];
    for (let i = 0; i < valid.length; i += 1) {
      const point = valid[i];
      const next = valid[i + 1];
      const isGroundSegment = point.onGround && next?.onGround;
      if (isGroundSegment && i % 5 !== 0) continue;
      simplified.push(point);
    }
    return simplified.map((point) => [point.lon, point.lat, 0] as [number, number, number]);
  }, [points]);
  const pathLayer = new PathLayer({
    id: "track-path",
    data: segments,
    getPath: (d: { path: [number, number, number][] }) => d.path,
    getColor: (d: { color: [number, number, number, number] }) => d.color,
    getWidth: 4,
    widthUnits: "pixels",
    opacity: 0.9,
    rounded: true,
    pickable: false,
    parameters: { depthTest: false },
    positionFormat: "XYZ",
  });

  const glowLayer = new PathLayer({
    id: "track-glow",
    data: segments,
    getPath: (d: { path: [number, number, number][] }) => d.path,
    getColor: (d: { color: [number, number, number, number] }) => [
      d.color[0],
      d.color[1],
      d.color[2],
      90,
    ],
    getWidth: 10,
    widthUnits: "pixels",
    opacity: 0.8,
    rounded: true,
    pickable: false,
    parameters: { depthTest: false },
    positionFormat: "XYZ",
  });

  const groundLayer = new PathLayer({
    id: "track-ground",
    data: [{ path: groundPath }],
    getPath: (d: { path: [number, number, number][] }) => d.path,
    getColor: [148, 163, 184, 200],
    getWidth: 2,
    widthUnits: "pixels",
    opacity: 0.8,
    rounded: true,
    pickable: false,
    parameters: { depthTest: false },
    positionFormat: "XYZ",
  });

  const verticalGlowLayer = new PathLayer({
    id: "track-vertical-glow",
    data: segments.filter((_, index) => index % 2 === 0),
    getPath: (d: { vertical: [number, number, number][] }) => d.vertical,
    getColor: [14, 116, 144, 140],
    getWidth: 14,
    widthUnits: "pixels",
    opacity: 0.9,
    rounded: true,
    pickable: false,
    parameters: { depthTest: false },
    positionFormat: "XYZ",
  });

  const verticalLayer = new PathLayer({
    id: "track-vertical",
    data: segments.filter((_, index) => index % 2 === 0),
    getPath: (d: { vertical: [number, number, number][] }) => d.vertical,
    getColor: [6, 182, 212, 255],
    getWidth: 8,
    widthUnits: "pixels",
    opacity: 1,
    rounded: true,
    pickable: false,
    parameters: { depthTest: false },
    positionFormat: "XYZ",
  });

  const planeLayer = new ScatterplotLayer({
    id: "track-plane",
    data: animatedPath.length ? [animatedPath[animationIndex % animatedPath.length]] : [],
    getPosition: (d: [number, number, number]) => d,
    getFillColor: [15, 23, 42, 230],
    getLineColor: [56, 189, 248, 255],
    lineWidthMinPixels: 2,
    stroked: true,
    radiusMinPixels: 6,
    radiusMaxPixels: 10,
    pickable: false,
    positionFormat: "XYZ",
  });

  const boundaryLayer = new PolygonLayer({
    id: "atc-boundaries",
    data: boundaries,
    getPolygon: (d: Boundary) => d.points.map((p) => [p.lon, p.lat]),
    getFillColor: [251, 146, 60, 40],
    getLineColor: [249, 115, 22, 220],
    lineWidthMinPixels: 2,
    filled: true,
    stroked: true,
    pickable: false,
    parameters: { depthTest: false },
  });

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const source = map.getSource("openmaptiles");
    if (!source || map.getLayer("3d-buildings")) return;
    const layers = map.getStyle()?.layers ?? [];
    const labelLayer = layers.find(
      (layer) => layer.type === "symbol" && (layer.layout as { "text-field"?: unknown })?.["text-field"],
    );
    map.addLayer(
      {
        id: "3d-buildings",
        source: "openmaptiles",
        "source-layer": "building",
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#94a3b8",
          "fill-extrusion-height": ["get", "render_height"],
          "fill-extrusion-base": ["get", "render_min_height"],
          "fill-extrusion-opacity": 0.55,
        },
      },
      labelLayer?.id,
    );
  }, []);

  return (
    <div
      className={`relative h-96 w-full overflow-hidden rounded-2xl border border-[color:var(--border)] sm:h-[26rem] lg:h-[30rem] ${className ?? ""}`}
    >
      <DeckGL
        initialViewState={viewState}
        controller={{ dragRotate: true, touchRotate: true, scrollZoom: true }}
        layers={[
          boundaryLayer,
          verticalGlowLayer,
          verticalLayer,
          groundLayer,
          glowLayer,
          pathLayer,
          planeLayer,
        ]}
      >
        <Map
          ref={mapRef}
          reuseMaps
          mapLib={maplibregl}
          mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""}`}
          onLoad={handleMapLoad}
        />
      </DeckGL>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.12),transparent_55%)]" />
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Ground
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Climb
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Cruise
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          Descent
        </span>
      </div>
      <div className="absolute bottom-3 right-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        Drag to pan, scroll to zoom
      </div>
    </div>
  );
}
