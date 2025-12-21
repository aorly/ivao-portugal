"use client";

import { useEffect, useRef, useState } from "react";

type NavAid = { id: string; type: "FIX" | "VOR" | "NDB"; code: string; lat: number; lon: number; extra?: string | null };
type Boundary = { id: string; label: string; points: { lat: number; lon: number }[] };

type Props = {
  navAids: NavAid[];
  boundaries: Boundary[];
};

declare global {
  interface Window {
    L?: typeof import("leaflet");
  }
}

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

const navColors: Record<NavAid["type"], { stroke: string; fill: string }> = {
  FIX: { stroke: "#22c55e", fill: "#34d399" },
  VOR: { stroke: "#3b82f6", fill: "#93c5fd" },
  NDB: { stroke: "#f59e0b", fill: "#fbbf24" },
};

export function FirMap({ navAids, boundaries }: Props) {
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
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
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 14,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
    const pointsForBounds: [number, number][] = [];

    boundaries.forEach((b) => {
      const coords = b.points
        .map((p) => {
          if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return null;
          return [Number(p.lat), Number(p.lon)] as [number, number];
        })
        .filter(Boolean) as [number, number][];
      if (coords.length) {
        const poly = L.polygon(coords, {
          color: "#f97316",
          weight: 2,
          opacity: 0.8,
          fillColor: "#fb923c",
          fillOpacity: 0.15,
        }).bindTooltip(b.label, { permanent: false });
        layer.addLayer(poly);
        pointsForBounds.push(...coords);
      }
    });

    navAids.forEach((item) => {
      const color = navColors[item.type];
      const pt: [number, number] = [item.lat, item.lon];
      pointsForBounds.push(pt);
      const marker = L.circleMarker(pt, {
        radius: item.type === "FIX" ? 4 : item.type === "VOR" ? 6 : 5,
        color: color.stroke,
        weight: 2,
        fillColor: color.fill,
        fillOpacity: 0.3,
      }).bindTooltip(`${item.code}${item.extra ? ` (${item.extra})` : ""} [${item.type}]`, { permanent: false });
      layer.addLayer(marker);
    });

    layer.addTo(map);
    layerRef.current = layer;

    setTimeout(() => map.invalidateSize(), 50);

    if (pointsForBounds.length) {
      const bounds = L.latLngBounds(pointsForBounds);
      map.fitBounds(bounds.pad(0.15), { animate: false });
    } else {
      map.setView([0, 0], 2);
    }
  }, [ready, navAids, boundaries]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full rounded-xl overflow-hidden border border-[color:var(--border)] bg-[#0b1324]"
    />
  );
}
