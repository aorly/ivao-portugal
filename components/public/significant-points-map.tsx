"use client";

import { useEffect, useRef, useState } from "react";
import type { SignificantPoint } from "@/lib/significant-points";
import type { LeafletLatLng, LeafletLayerGroup, LeafletMap, LeafletModule } from "@/lib/leaflet-types";

type Props = {
  points: SignificantPoint[];
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

export function SignificantPointsMap({ points }: Props) {
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletLayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadLeafletAssets()
      .then((L) => {
        if (!containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);
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

    if (layerRef.current) {
      layerRef.current.clearLayers();
      layerRef.current.removeFrom(map);
    }
    const layer = L.layerGroup();
    points.forEach((p) => {
      const lat = Number(p.latitude);
      const lon = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const marker = L.circleMarker([lat, lon], {
        radius: 4,
        color: "#8b5cf6",
        weight: 1.5,
        fillColor: "#a855f7",
        fillOpacity: 0.35,
      }).bindTooltip(`${p.code} – ${p.location}`, { permanent: false });
      layer.addLayer(marker);
    });
    layer.addTo(map);
    layerRef.current = layer;

    const coords: LeafletLatLng[] = points
      .map((p) => [Number(p.latitude), Number(p.longitude)] as LeafletLatLng)
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
    if (coords.length) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds.pad(0.15), { animate: false });
    }
  }, [ready, points]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-3)]"
    />
  );
}
