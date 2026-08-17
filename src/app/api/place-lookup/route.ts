import { NextRequest, NextResponse } from "next/server";

// Looks a business up on OpenStreetMap by "name, city" and returns up to
// three candidate addresses (plus hours/phone/website when OSM has them).
// Free, no API key; swap for Google Places later without touching the form.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return NextResponse.json({ results: [] });

  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&extratags=1&limit=3&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, {
      headers: {
        // Nominatim's usage policy requires an identifying User-Agent
        "User-Agent": "TheTrueReview/1.0 (business address lookup)",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ results: [] });

    type Row = {
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string>;
      extratags?: Record<string, string>;
    };
    const rows = (await res.json()) as Row[];
    const results = rows.map((r) => {
      const a = r.address ?? {};
      const street = [a.road, a.house_number].filter(Boolean).join(" ");
      const locality = a.city || a.town || a.village || a.suburb || "";
      const compact = [street, locality].filter(Boolean).join(", ");
      return {
        address: compact || (r.display_name ?? "").split(",").slice(0, 3).join(",").trim(),
        zip: a.postcode ?? "",
        hours: r.extratags?.opening_hours ?? "",
        phone: r.extratags?.phone ?? r.extratags?.["contact:phone"] ?? "",
        website: r.extratags?.website ?? r.extratags?.["contact:website"] ?? "",
        label: (r.display_name ?? "").split(",").slice(0, 4).join(",").trim(),
        lat: r.lat ? Number(r.lat) : undefined,
        lng: r.lon ? Number(r.lon) : undefined,
      };
    });
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
