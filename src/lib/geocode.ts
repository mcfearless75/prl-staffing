// UK postcode -> lat/lng geocoding via postcodes.io — free, unlimited, no API
// key. Deliberately not using GETADDRESS/IDEAL_POSTCODES_API_KEY: that key is
// on a capped trial credit already consumed by the staff address-lookup form
// (see src/app/api/postcode/route.ts) and bulk geocoding hundreds of records
// would burn through it instantly.

const BULK_ENDPOINT = "https://api.postcodes.io/postcodes";
const BATCH_SIZE = 100; // postcodes.io bulk lookup hard limit per request

export interface GeoPoint {
  lat: number;
  lng: number;
}

interface BulkResultItem {
  query: string;
  result: { latitude: number; longitude: number } | null;
}

function normalize(postcode: string): string {
  return postcode.trim().toUpperCase();
}

/**
 * Looks up lat/lng for a batch of postcodes. Returns a map keyed by the
 * normalized postcode; missing/invalid postcodes are simply absent from the
 * map rather than throwing, so callers can distinguish "not found" from
 * "lookup failed".
 */
export async function geocodePostcodesBulk(postcodes: string[]): Promise<Map<string, GeoPoint>> {
  const unique = Array.from(new Set(postcodes.map(normalize).filter(Boolean)));
  const results = new Map<string, GeoPoint>();

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const res = await fetch(BULK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    if (!res.ok) continue; // skip this batch, leave those postcodes ungeocoded rather than throwing

    const data: { status: number; result: BulkResultItem[] } = await res.json();
    for (const item of data.result ?? []) {
      if (item.result) {
        results.set(normalize(item.query), { lat: item.result.latitude, lng: item.result.longitude });
      }
    }
  }

  return results;
}
