export type LeafletLatLng = [number, number];
export type LeafletBounds = { pad: (ratio: number) => LeafletBounds };
export type LeafletMap = {
  fitBounds: (bounds: LeafletBounds, options?: { animate?: boolean }) => void;
  setView: (center: LeafletLatLng, zoom: number) => void;
  invalidateSize: () => void;
};
export type LeafletLayer = {
  addTo: (map: LeafletMap | LeafletLayerGroup) => LeafletLayer;
  bindTooltip: (content: string, options?: { permanent?: boolean }) => LeafletLayer;
};
export type LeafletLayerGroup = {
  addLayer: (layer: LeafletLayer) => LeafletLayerGroup;
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
  removeFrom: (map: LeafletMap) => void;
};
export type LeafletTileLayer = {
  addTo: (map: LeafletMap) => LeafletTileLayer;
  removeFrom: (map: LeafletMap) => void;
};
export type LeafletModule = {
  map: (container: HTMLElement, options: { zoomControl: boolean; attributionControl: boolean }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number; subdomains?: string; attribution: string }) => LeafletTileLayer;
  layerGroup: () => LeafletLayerGroup;
  circleMarker: (
    point: LeafletLatLng,
    options: { radius: number; color: string; weight: number; fillColor: string; fillOpacity: number },
  ) => LeafletLayer;
  polyline: (points: LeafletLatLng[], options: { color: string; weight: number; opacity: number }) => LeafletLayer;
  polygon: (
    points: LeafletLatLng[],
    options: { color: string; weight: number; opacity: number; fillColor: string; fillOpacity: number },
  ) => LeafletLayer;
  latLngBounds: (points: LeafletLatLng[]) => LeafletBounds;
};

declare global {
  interface Window {
    L?: LeafletModule;
  }
}
