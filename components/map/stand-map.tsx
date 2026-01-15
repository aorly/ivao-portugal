"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/use-theme";
import type { LeafletLatLng, LeafletLayerGroup, LeafletMap, LeafletModule, LeafletTileLayer } from "@/lib/leaflet-types";

type Stand = { id: string; name: string; lat: number; lon: number; occupied: boolean };

type Props = {
  stands: Stand[];
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

export function StandMap({ stands }: Props) {
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
    stands.forEach((stand) => {
      const marker = L.circleMarker([stand.lat, stand.lon], {
        radius: 6,
        color: stand.occupied ? "#ca8a04" : "#22c55e",
        weight: 2,
        fillColor: stand.occupied ? "#facc15" : "#34d399",
        fillOpacity: 0.3,
      }).bindTooltip(`${stand.name}${stand.occupied ? " (occupied)" : ""}`, { permanent: false });
      layer.addLayer(marker);
    });
    layer.addTo(map);
    layerRef.current = layer;

    if (stands.length) {
      const bounds = L.latLngBounds(stands.map((s): LeafletLatLng => [s.lat, s.lon]));
      map.fitBounds(bounds.pad(0.2), { animate: false });
    }
  }, [ready, stands]);

  return (
    <div
      ref={containerRef}
      className="h-64 w-full rounded-xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--surface-2)]"
    />
  );
}
