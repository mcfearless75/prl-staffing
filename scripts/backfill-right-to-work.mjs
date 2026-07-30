/**
 * Backfills the right-to-work and emergency-contact columns on Contractor from
 * the legacy notes JSON blob written by /apply.
 *
 * Until migration 20260730_contractor_right_to_work these fields existed only
 * inside that blob, so they were queryable by nobody and displayed on no screen.
 * Every contractor who applied before that migration still has them buried.
 *
 * Dry run (default — reports what WOULD change, writes nothing):
 *     railway run --service Postgres node scripts/backfill-right-to-work.mjs
 *
 * Execute:
 *     railway run --service Postgres node scripts/backfill-right-to-work.mjs --confirm
 *
 * Safety properties:
 *   - Never overwrites a column that already holds a value; only fills nulls.
 *   - Never modifies notes. The blob stays as the audit trail of what was
 *     actually submitted, so this is re-runnable and reversible in effect.
 *   - A date that will not parse is left null and counted, not guessed at.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("\n  No database URL. Run via:");
  console.error("    railway run --service Postgres node scripts/backfill-right-to-work.mjs\n");
  process.exit(2);
}

const CONFIRM = process.argv.includes("--confirm");
const prisma = new PrismaClient();

// Mirrors parseDate() in src/app/api/apply/route.ts. UK DD/MM/YYYY must be
// handled explicitly: new Date("03/04/2026") silently reads as 4 March under US
// convention when the applicant meant 3 April.
function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();
  const uk = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (uk) {
    const [, d, m, y] = uk;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }
  const fb = new Date(raw);
  return Number.isNaN(fb.getTime()) ? null : fb;
}

// blob key -> column, with how to coerce it.
const MAP = [
  ["nonBritishNational",       "nonBritishNational",       (v) => (v ? String(v) : null)],
  ["requiresWorkPermit",       "requiresWorkPermit",       (v) => (v ? String(v) : null)],
  ["passportNumber",           "passportNumber",           (v) => (v ? String(v) : null)],
  ["passportExpiry",           "passportExpiry",           parseDate],
  ["visaNumber",               "visaNumber",               (v) => (v ? String(v) : null)],
  ["visaExpiry",               "visaExpiry",               parseDate],
  ["emergencyContactName",     "emergencyContactName",     (v) => (v ? String(v) : null)],
  ["emergencyContactPhone",    "emergencyContactPhone",    (v) => (v ? String(v) : null)],
  ["emergencyContactRelation", "emergencyContactRelation", (v) => (v ? String(v) : null)],
  ["nextOfKin",                "nextOfKin",                (v) => (v ? String(v) : null)],
];

console.log("\n==============================================");
console.log(`  Right-to-work backfill — ${CONFIRM ? "EXECUTING" : "DRY RUN"}`);
console.log("==============================================\n");

const contractors = await prisma.contractor.findMany({
  where: { notes: { not: null } },
  select: {
    id: true, notes: true,
    nonBritishNational: true, requiresWorkPermit: true,
    passportNumber: true, passportExpiry: true,
    visaNumber: true, visaExpiry: true,
    emergencyContactName: true, emergencyContactPhone: true,
    emergencyContactRelation: true, nextOfKin: true,
  },
});

let notJson = 0, noData = 0, updated = 0, failedDates = 0;
const filledPerColumn = {};

for (const c of contractors) {
  let blob;
  try {
    blob = JSON.parse(c.notes);
    if (typeof blob !== "object" || blob === null) { notJson++; continue; }
  } catch {
    // Free-text staff notes rather than an application blob — leave alone.
    notJson++;
    continue;
  }

  const data = {};
  for (const [key, column, coerce] of MAP) {
    if (c[column] != null) continue;          // already populated, never overwrite
    if (blob[key] == null || blob[key] === "") continue;
    const value = coerce(blob[key]);
    if (value == null) {
      if (coerce === parseDate) failedDates++;
      continue;
    }
    data[column] = value;
    filledPerColumn[column] = (filledPerColumn[column] || 0) + 1;
  }

  if (!Object.keys(data).length) { noData++; continue; }

  if (CONFIRM) {
    await prisma.contractor.update({ where: { id: c.id }, data });
  }
  updated++;
}

console.log(`contractors with notes:        ${contractors.length}`);
console.log(`  notes not an application blob: ${notJson}`);
console.log(`  blob held nothing new:         ${noData}`);
console.log(`  ${CONFIRM ? "UPDATED" : "would update"}:${CONFIRM ? "                      " : "                 "}${updated}`);
if (failedDates) console.log(`  dates that would not parse:    ${failedDates} (left null, raw value still in notes)`);

console.log("\nper-column fills:");
const cols = Object.keys(filledPerColumn).sort();
if (!cols.length) console.log("  (none)");
for (const col of cols) console.log(`  ${col.padEnd(26)} ${filledPerColumn[col]}`);

console.log("\n----------------------------------------------");
console.log(CONFIRM ? "  Done. Re-run to confirm it is now a no-op." : "  Nothing changed. Re-run with --confirm.");
console.log("==============================================\n");

await prisma.$disconnect();
