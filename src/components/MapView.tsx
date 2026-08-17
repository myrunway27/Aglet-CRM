"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  slug: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  score: number;
  count: number;
};

// OpenStreetMap tiles — free, no API key, no billing account.
export function MapView({ pins }: { pins: MapPin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current || mapRef.current) return;

      const map = L.map(ref.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      if (pins.length > 0) {
        const group = L.featureGroup(
          pins.map((p) =>
            L.marker([p.lat, p.lng]).bindPopup(
              `<a href="/business/${p.slug}" style="font-weight:600;color:#b34e1e">${p.name}</a><br>` +
                `<span style="color:#57534e">${p.city}${
                  p.count > 0 ? ` · ${p.score.toFixed(1)}★ (${p.count})` : " · no reviews yet"
                }</span>`
            )
          )
        ).addTo(map);
        map.fitBounds(group.getBounds().pad(0.2));
      } else {
        map.setView([31.78, 35.22], 8);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [pins]);

  return (
    <div>
      <div
        ref={ref}
        className="h-[70vh] min-h-80 w-full rounded-xl border border-stone-200 overflow-hidden z-0"
      />
      {pins.length === 0 && (
        <p className="mt-3 text-sm text-stone-500 text-center">
          No businesses have a location pinned yet. Addresses added with the &ldquo;Auto-fill&rdquo;
          button on{" "}
          <Link href="/add-business" className="text-brand-700 hover:underline">
            Add a business
          </Link>{" "}
          will appear here.
        </p>
      )}
    </div>
  );
}
