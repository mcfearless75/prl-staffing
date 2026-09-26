// Keeps cached postcode coordinates honest. Before this, nothing cleared
// geocodedAt when a postcode was edited, so a worker who moved kept their old
// location for good, and new records waited for a manual backfill.

import { prisma } from "@/lib/db";
import { geocodePostcodesBulk } from "@/lib/geocode";

function key(postcode: string | null | undefined): string {
  return (postcode ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * Fields to merge into an update so a changed postcode drops its stale
 * coordinates. Empty when the postcode is the same however it was typed.
 */
export function postcodeGeoReset(
  oldPostcode: string | null | undefined,
  newPostcode: string | null | undefined
): { latitude: null; longitude: null; geocodedAt: null } | Record<string, never> {
  if (key(oldPostcode) === key(newPostcode)) return {};
  return { latitude: null, longitude: null, geocodedAt: null };
}

/**
 * Best-effort geocode of one record that has a postcode but no coordinates.
 * Never throws: a postcodes.io outage must not fail the save that called it,
 * and the record stays eligible for /api/geocode/backfill.
 */
export async function refreshGeocode(kind: "contractor" | "site", id: string): Promise<void> {
  try {
    const row =
      kind === "contractor"
        ? await prisma.contractor.findUnique({ where: { id }, select: { postcode: true, geocodedAt: true } })
        : await prisma.site.findUnique({ where: { id }, select: { postcode: true, geocodedAt: true } });
    if (!row?.postcode || row.geocodedAt) return;

    const point = (await geocodePostcodesBulk([row.postcode], { timeoutMs: 3000 })).get(
      row.postcode.trim().toUpperCase()
    );
    if (!point) return;

    const data = { latitude: point.lat, longitude: point.lng, geocodedAt: new Date() };
    if (kind === "contractor") await prisma.contractor.update({ where: { id }, data });
    else await prisma.site.update({ where: { id }, data });
  } catch (error) {
    console.error(`Geocode refresh failed for ${kind} ${id}:`, error);
  }
}
