"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/use-theme";
import type { LeafletLayerGroup, LeafletMap, LeafletModule, LeafletTileLayer } from "@/lib/leaflet-types";

type Point = { lat: number; lon: number };
type Path = { id: string; name: string; type: "SID" | "STAR"; points: Point[] };

type Props = {
  paths: Path[];
};

function loadLeafletAssets(): Promise<LeafletModule> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.L) return resolve(window.L);

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-leaflet="1"]');
    const existingCss = document.querySelector<HTMLLinkElement>('link[data-leaflet="1"]');

    const finish = () => {
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error("Leaflet failed to load"));
      }
    };

    if (!existingCss) {
      const link = document.createElement("link");
      link.setAttribute("data-leaflet", "1");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Leaflet script failed")));
    } else {
      const script = document.createElement("script");
      script.setAttribute("data-leaflet", "1");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = finish;
      script.onerror = () => reject(new Error("Leaflet script failed"));
      document.body.appendChild(script);
    }
  });
}

const colors: Record<Path["type"], string> = {
  SID: "#3b82f6",
  STAR: "#a855f7",
};

export function ProcedureMap({ paths }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletLayerGroup | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const theme = useTheme();
  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  useEffect(() => {
    loadLeafletAssets()
      .then((L) => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        });
        mapRef.current = map;
        setReady(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready) return;
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) {
      tileLayerRef.current.removeFrom(map);
    }
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 12,
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, [ready, tileUrl]);

  useEffect(() => {
    if (!ready) return;
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    if (layerRef.current) {
      layerRef.current.clearLayers();
      layerRef.current.removeFrom(map);
    }
    const layer = L.layerGroup();
    const allPoints: [number, number][] = [];

    paths.forEach((path) => {
      if (!path.points.length) return;
      const latlngs: [number, number][] = [];
      path.points.forEach((p) => {
        const lat = Number(p.lat);
        const lon = Number(p.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        latlngs.push([lat, lon]);
        allPoints.push([lat, lon]);
      });
      if (!latlngs.length) return;
      L.polyline(latlngs, { color: colors[path.type], weight: 3, opacity: 0.8 }).addTo(layer);
      latlngs.forEach((pt, idx) => {
        L.circleMarker(pt, {
          radius: idx === 0 ? 5 : 4,
          color: colors[path.type],
          weight: 2,
          fillColor: colors[path.type],
          fillOpacity: 0.2,
        }).bindTooltip(`${path.name} (${path.type})`).addTo(layer);
      });
    });

    layer.addTo(map);
    layerRef.current = layer;

    // Ensure sizing is correct if container was initially hidden
    setTimeout(() => {
      map.invalidateSize();
    }, 50);

    if (allPoints.length === 1) {
      map.setView(allPoints[0], 10);
    } else if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds.pad(0.2), { animate: false });
    } else {
      map.setView([0, 0], 2);
    }
  }, [ready, paths]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full rounded-xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-2)]"
    />
  );
}
