"use client";

import { useMemo, useState } from "react";
import MapView from "react-map-gl/maplibre";
import { DeckGL } from "@deck.gl/react";
import { PathLayer, TextLayer } from "@deck.gl/layers";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/components/theme/use-theme";

type Route = {
  from: [number, number];
  to: [number, number];
  count: number;
  fromIcao: string;
  toIcao: string;
};

type Props = {
  routes: Route[];
};

export function ProfileStatsRoutesMap({ routes }: Props) {
  const theme = useTheme();
  const [selectedRoute, setSelectedRoute] = useState<{
    from: string;
    to: string;
    count: number;
  } | null>(null);
  const arcPoints = (from: [number, number], to: [number, number], steps = 48) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const [lat1, lon1] = from.map(toRad) as [number, number];
    const [lat2, lon2] = to.map(toRad) as [number, number];
    const d =
      2 *
      Math.asin(
        Math.sqrt(
          Math.sin((lat2 - lat1) / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
        ),
      );
    if (!Number.isFinite(d) || d === 0) return [[from[1], from[0]], [to[1], to[0]]];
    const points: [number, number][] = [];
    for (let i = 0; i <= steps; i += 1) {
      const f = i / steps;
      const A = Math.sin((1 - f) * d) / Math.sin(d);
      const B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      const lon = Math.atan2(y, x);
      points.push([toDeg(lon), toDeg(lat)]);
    }
    return points;
  };
  const routeAirports = useMemo(() => {
    const counts = new globalThis.Map<string, number>();
    const coords = new globalThis.Map<string, [number, number]>();
    routes.forEach((route) => {
      counts.set(route.fromIcao, (counts.get(route.fromIcao) ?? 0) + 1);
      counts.set(route.toIcao, (counts.get(route.toIcao) ?? 0) + 1);
      coords.set(route.fromIcao, route.from);
      coords.set(route.toIcao, route.to);
    });
    return [...coords.entries()]
      .map(([key, value]) => ({
        key,
        coord: value,
        count: counts.get(key) ?? 1,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [routes]);
  const pathData = useMemo(
    () =>
      routes.map((route) => ({
        path: arcPoints(route.from, route.to, 48),
        count: route.count,
        from: route.fromIcao,
        to: route.toIcao,
      })),
    [routes],
  );

  const maxCount = Math.max(...routes.map((route) => route.count), 1);

  const baseColor =
    theme === "dark"
      ? ([80, 160, 255, 140] as [number, number, number, number])
      : ([70, 140, 255, 150] as [number, number, number, number]);
  const midColor =
    theme === "dark"
      ? ([120, 190, 255, 170] as [number, number, number, number])
      : ([110, 180, 255, 170] as [number, number, number, number]);
  const hotColor =
    theme === "dark"
      ? ([170, 220, 255, 200] as [number, number, number, number])
      : ([140, 210, 255, 200] as [number, number, number, number]);
  const glowLayer = new PathLayer({
    id: "routes-glow",
    data: pathData,
    getPath: (d: { path: [number, number][] }) => d.path,
    getColor: (d: { count: number }) => (d.count > 5 ? hotColor : d.count > 1 ? midColor : baseColor),
    getWidth: (d: { count: number }) => 2 + (d.count / maxCount) * 4,
    widthUnits: "pixels",
    opacity: 0.22,
    pickable: false,
  });

  const layer = new PathLayer({
    id: "routes",
    data: pathData,
    getPath: (d: { path: [number, number][] }) => d.path,
    getColor: (d: { count: number }) => (d.count > 5 ? hotColor : d.count > 1 ? midColor : baseColor),
    getWidth: (d: { count: number }) => 0.6 + (d.count / maxCount) * 1.8,
    widthUnits: "pixels",
    opacity: 0.9,
    pickable: true,
  });
  const textLayer = new TextLayer({
    id: "airport-labels",
    data: routeAirports,
    getPosition: (d: { coord: [number, number] }) => [d.coord[1], d.coord[0]],
    getText: (d: { key: string }) => d.key,
    getSize: (d: { count: number }) => 10 + Math.min(6, d.count),
    sizeUnits: "pixels",
    getColor: theme === "dark" ? [233, 239, 255, 220] : [15, 27, 68, 200],
    getTextAnchor: "middle",
    getAlignmentBaseline: "bottom",
    fontFamily: "Inter, system-ui, sans-serif",
    pickable: false,
  });
  const mapStyle =
    theme === "dark"
      ? `https://api.maptiler.com/maps/toner-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""}`
      : `https://api.maptiler.com/maps/toner-lite/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""}`;

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-[color:var(--border)]">
      <DeckGL
        initialViewState={{ latitude: 39.5, longitude: -8.0, zoom: 4, pitch: 0, bearing: 0 }}
        controller={{ dragRotate: true, scrollZoom: true }}
        layers={[glowLayer, layer, textLayer]}
        style={{ width: "100%", height: "100%" }}
        onClick={(info) => {
          if (!info?.object) {
            setSelectedRoute(null);
            return;
          }
          const obj = info.object as { from?: string; to?: string; count?: number };
          if (!obj.from || !obj.to) return;
          setSelectedRoute({ from: obj.from, to: obj.to, count: obj.count ?? 1 });
        }}
      >
        <MapView
          mapLib={maplibregl}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyle}
        />
      </DeckGL>
      {selectedRoute ? (
        <div className="absolute bottom-4 left-4 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--text-primary)] shadow-[var(--shadow-soft)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-muted)]">Route</p>
          <p className="text-sm font-semibold">
            {selectedRoute.from} - {selectedRoute.to}
          </p>
          <p className="text-[11px] text-[color:var(--text-muted)]">{selectedRoute.count} flights</p>
        </div>
      ) : null}
    </div>
  );
}
