import Link from "next/link";
import { prisma } from "@/lib/db";
import { MapView, type MapPin } from "@/components/MapView";

export const dynamic = "force-dynamic";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; tags?: string }>;
}) {
  const { city } = await searchParams;

  const businesses = await prisma.business.findMany({
    where: { lat: { not: null }, lng: { not: null }, ...(city ? { city } : {}) },
    select: {
      slug: true, name: true, city: true, lat: true, lng: true,
      scoreAvg: true, scoreCount: true,
    },
    take: 500,
  });

  const pins: MapPin[] = businesses.map((b) => ({
    slug: b.slug,
    name: b.name,
    city: b.city,
    lat: b.lat!,
    lng: b.lng!,
    score: b.scoreAvg,
    count: b.scoreCount,
  }));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
        <div>
          <h1 className="text-2xl font-bold">Map</h1>
          <p className="text-sm text-stone-600">
            {pins.length} place{pins.length !== 1 ? "s" : ""} with a pinned location
            {city ? ` in ${city}` : ""}.
          </p>
        </div>
        <Link href="/" className="text-sm text-brand-700 hover:underline">
          ← Back to list
        </Link>
      </div>
      <MapView pins={pins} />
    </div>
  );
}
