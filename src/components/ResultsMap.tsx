"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { addBasemap } from "@/lib/basemap";

export type ResultPin = { n: number; slug: string; name: string; lat: number; lng: number };

// Numbered pins matching the result list, the way every review site does it.
export function ResultsMap({ pins, compact = false }: { pins: ResultPin[]; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || pins.length === 0) return;
    let map: import("leaflet").Map | undefined;
    (async () => {
      const L = (await import("leaflet")).default;
      map = L.map(ref.current!, { scrollWheelZoom: false });
      await addBasemap(L, map);
      const group = L.featureGroup(
        pins.map((p) =>
          L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: "",
              html: `<div style="width:26px;height:26px;border-radius:999px;background:#f4711c;color:#fff;font:700 12px/26px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${p.n}</div>`,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
          }).bindPopup(`<a href="/business/${p.slug}"><strong>${p.name.replace(/</g, "&lt;")}</strong></a>`)
        )
      ).addTo(map);
      if (pins.length === 1) map.setView([pins[0].lat, pins[0].lng], 15);
      else map.fitBounds(group.getBounds().pad(0.15));
    })();
    return () => { map?.remove(); };
  }, [pins]);
  if (pins.length === 0) return null;
  return (
    <div
      ref={ref}
      className={compact ? "h-full w-full bg-stone-100" : "h-[calc(100vh-7rem)] min-h-[420px] rounded-2xl border border-line overflow-hidden bg-stone-100"}
    />
  );
}
