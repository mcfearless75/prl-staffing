/**
 * Geocodes contractors and sites that have a postcode but no cached lat/lng.
 * Same logic as POST /api/geocode/backfill (the coverage map's refresh button),
 * runnable without a staff browser session.
 *
 *     railway run --service Postgres node scripts/backfill-geocode.mjs           (dry run: counts only)
 *     railway run --service Postgres node scripts/backfill-geocode.mjs --apply
 *
 * Only touches records missing coordinates; unresolvable postcodes are left
 * eligible for retry. Output is PII-free: counts only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/backfill-geocode.mjs\n");
  process.exit(2);
}

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();
const norm = (p) => p.trim().toUpperCase();

async function geocodeBulk(postcodes) {
  const unique = [...new Set(postcodes.map(norm).filter(Boolean))];
  const out = new Map();
  for (let i = 0; i < unique.length; i += 100) {
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodes: unique.slice(i, i + 100) }),
    });
    if (!res.ok) {
      console.error(`  batch ${i / 100 + 1} failed: HTTP ${res.status}`);
      continue;
    }
    const data = await res.json();
    for (const item of data.result ?? []) {
      if (item.result) out.set(norm(item.query), { lat: item.result.latitude, lng: item.result.longitude });
    }
  }
  return out;
}

const where = { postcode: { not: null }, geocodedAt: null };
const [contractors, sites] = await Promise.all([
  prisma.contractor.findMany({ where, select: { id: true, postcode: true } }),
  prisma.site.findMany({ where, select: { id: true, postcode: true } }),
]);
const withCoords = await prisma.contractor.count({ where: { latitude: { not: null } } });

const [siteTotal, siteWithPostcode, siteWithCoords] = await Promise.all([
  prisma.site.count({ where: { isActive: true } }),
  prisma.site.count({ where: { isActive: true, postcode: { not: null } } }),
  prisma.site.count({ where: { isActive: true, latitude: { not: null } } }),
]);

console.log(`Active sites: ${siteTotal} (with postcode ${siteWithPostcode}, geocoded ${siteWithCoords})`);
console.log(`Contractors already geocoded: ${withCoords}`);
console.log(`Missing coordinates: ${contractors.length} contractors, ${sites.length} sites`);

const geo = await geocodeBulk([...contractors, ...sites].map((r) => r.postcode).filter(Boolean));
const resolvable = (rows) => rows.filter((r) => r.postcode && geo.has(norm(r.postcode)));
const cOk = resolvable(contractors);
const sOk = resolvable(sites);
console.log(`Resolvable by postcodes.io: ${cOk.length} contractors, ${sOk.length} sites`);
console.log(`Unresolvable (typo/blank/non-UK): ${contractors.length - cOk.length} contractors, ${sites.length - sOk.length} sites`);

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply.");
} else {
  const now = new Date();
  for (const r of cOk) {
    const p = geo.get(norm(r.postcode));
    await prisma.contractor.update({ where: { id: r.id }, data: { latitude: p.lat, longitude: p.lng, geocodedAt: now } });
  }
  for (const r of sOk) {
    const p = geo.get(norm(r.postcode));
    await prisma.site.update({ where: { id: r.id }, data: { latitude: p.lat, longitude: p.lng, geocodedAt: now } });
  }
  console.log(`\nWritten: ${cOk.length} contractors, ${sOk.length} sites.`);
}

await prisma.$disconnect();
