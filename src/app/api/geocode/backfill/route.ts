/**
 * Geocodes contractors and sites that have a postcode but no cached lat/lng
 * yet, for the coverage map. Safe to run repeatedly — only touches records
 * missing coordinates, and postcodes that fail to resolve are left eligible
 * for retry next time (not permanently skipped) since a typo fix should be
 * picked up on the next run.
 *
 * POST /api/geocode/backfill
 * Auth: staff session required
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { geocodePostcodesBulk } from "@/lib/geocode";

export async function POST() {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }

  const [contractors, sites] = await Promise.all([
    prisma.contractor.findMany({
      where: { postcode: { not: null }, geocodedAt: null },
      select: { id: true, postcode: true },
    }),
    prisma.site.findMany({
      where: { postcode: { not: null }, geocodedAt: null },
      select: { id: true, postcode: true },
    }),
  ]);

  const allPostcodes = [
    ...contractors.map((c) => c.postcode!),
    ...sites.map((s) => s.postcode!),
  ];

  if (allPostcodes.length === 0) {
    return NextResponse.json({ contractorsGeocoded: 0, sitesGeocoded: 0, contractorsFailed: 0, sitesFailed: 0 });
  }

  const geocoded = await geocodePostcodesBulk(allPostcodes);

  let contractorsGeocoded = 0;
  let contractorsFailed = 0;
  for (const c of contractors) {
    const point = geocoded.get(c.postcode!.trim().toUpperCase());
    if (point) {
      await prisma.contractor.update({
        where: { id: c.id },
        data: { latitude: point.lat, longitude: point.lng, geocodedAt: new Date() },
      });
      contractorsGeocoded++;
    } else {
      contractorsFailed++;
    }
  }

  let sitesGeocoded = 0;
  let sitesFailed = 0;
  for (const s of sites) {
    const point = geocoded.get(s.postcode!.trim().toUpperCase());
    if (point) {
      await prisma.site.update({
        where: { id: s.id },
        data: { latitude: point.lat, longitude: point.lng, geocodedAt: new Date() },
      });
      sitesGeocoded++;
    } else {
      sitesFailed++;
    }
  }

  return NextResponse.json({ contractorsGeocoded, sitesGeocoded, contractorsFailed, sitesFailed });
}
