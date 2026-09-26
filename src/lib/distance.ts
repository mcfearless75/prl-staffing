// Straight-line distance for smart matching ("workers within N miles of this
// site"). Pure: coordinates come from the geocoded postcodes on Contractor and
// Site (see src/lib/geocode.ts and src/lib/geo-refresh.ts).

import type { GeoPoint } from "@/lib/geocode";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Haversine great-circle distance in miles. */
export function milesBetween(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 0-100: 100 on site, falling linearly to 50 at the radius and 0 at twice the
 * radius. Beyond the radius is normally excluded anyway (see locationFactor).
 */
export function distanceScore(miles: number, radiusMiles: number): number {
  if (radiusMiles <= 0) return miles <= 0 ? 100 : 0;
  return Math.max(0, Math.round(100 - (miles / radiusMiles) * 50));
}

export interface LocationFactor {
  miles: number | null; // null when either end has no coordinates
  score: number;
  excluded: boolean; // beyond the radius: drop from the results
}

const NEUTRAL: LocationFactor = { miles: null, score: 50, excluded: false };

/**
 * The radius is a HARD filter (agreed with Paul 2026-09-26). A worker whose
 * postcode has not been geocoded is kept at a neutral score rather than
 * silently hidden, so missing data never makes someone disappear.
 */
export function locationFactor(
  origin: GeoPoint | null,
  worker: GeoPoint | null,
  radiusMiles: number
): LocationFactor {
  if (!origin || !worker) return NEUTRAL;
  const miles = milesBetween(origin, worker);
  return {
    miles,
    score: distanceScore(miles, radiusMiles),
    excluded: miles > radiusMiles,
  };
}
