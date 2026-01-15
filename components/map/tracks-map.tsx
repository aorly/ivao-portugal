"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/use-theme";

type TrackPoint = { lat: number; lon: number };

type Props = {
  points: TrackPoint[];
};

declare global {
  interface Window {
    L?: typeof import("leaflet");
  }
}

type LeafletMap = import("leaflet").Map;
type LeafletLayerGroup = import("leaflet").LayerGroup;
type LeafletTileLayer = import("leaflet").TileLayer;

function loadLeafletAssets(): Promise<typeof import("leaflet")> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.L) return resolve(window.L as typeof import("leaflet"));

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-leaflet="1"]');
    const existingCss = document.querySelector<HTMLLinkElement>('link[data-leaflet="1"]');

    const finish = () => {
      if (window.L) {
        resolve(window.L as typeof import("leaflet"));
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

export function TracksMap({ points }: Props) {
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
      maxZoom: 19,
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
    if (points.length > 0) {
      const latLngs = points.map((p) => [p.lat, p.lon]);
      const line = L.polyline(latLngs, { color: "#38bdf8", weight: 3, opacity: 0.8 });
      layer.addLayer(line);

      const start = points[0];
      const end = points[points.length - 1];
      const startMarker = L.circleMarker([start.lat, start.lon], {
        radius: 5,
        color: "#22c55e",
        weight: 2,
        fillColor: "#22c55e",
        fillOpacity: 0.6,
      }).bindTooltip("Start", { permanent: false });
      const endMarker = L.circleMarker([end.lat, end.lon], {
        radius: 5,
        color: "#f97316",
        weight: 2,
        fillColor: "#f97316",
        fillOpacity: 0.6,
      }).bindTooltip("End", { permanent: false });
      layer.addLayer(startMarker);
      layer.addLayer(endMarker);

      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds.pad(0.2), { animate: false });
    }

    layer.addTo(map);
    layerRef.current = layer;
  }, [ready, points]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)]"
    />
  );
}
