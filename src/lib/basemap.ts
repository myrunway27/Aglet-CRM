"use client";

import type * as Leaflet from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";

// The basemap: OpenFreeMap's "Liberty" vector style rendered by MapLibre
// inside Leaflet. Free for commercial use, no API key, and it looks like a
// street map people recognise rather than raw OpenStreetMap tiles. If WebGL
// is unavailable the raster OSM tiles stand in.
export const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &middot; Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export async function addBasemap(L: typeof Leaflet, map: Leaflet.Map) {
  try {
    await import("@maplibre/maplibre-gl-leaflet");
    const gl = L.maplibreGL({ style: "https://tiles.openfreemap.org/styles/liberty" });
    gl.addTo(map);
    map.attributionControl?.addAttribution(BASEMAP_ATTRIBUTION);
    return;
  } catch {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }
}
