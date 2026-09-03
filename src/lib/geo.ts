// Distance between a searcher and a business. "Near me" is one of the two
// filters people reach for most on a local search, so it is worth doing
// properly rather than approximating with a zip-code match.

const EARTH_KM = 6371;
const KM_PER_MILE = 1.609344;

/** Great-circle distance in miles. */
export function distanceMiles(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return (2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))) / KM_PER_MILE;
}

/** Radius options offered in the UI, in miles. */
export const RADII = [1, 2, 5, 10, 25] as const;
export type Radius = (typeof RADII)[number];

export function isRadius(n: number): n is Radius {
  return (RADII as readonly number[]).includes(n);
}

/** "0.4 mi", "3.2 mi", "12 mi" */
export function formatMiles(mi: number): string {
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

/** Parse a "lat,lng" search param, rejecting anything out of range. */
export function parseLatLng(value: string | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  const [a, b] = value.split(",").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  return { lat: a, lng: b };
}
