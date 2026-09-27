/**
 * Status clean-up (Paul, 2026-09-27): On Hold, Suspended and Left are retired
 * and become Inactive; "New" is retired.
 *
 *     railway run --service Postgres node scripts/migrate-contractor-statuses.mjs           (dry run)
 *     railway run --service Postgres node scripts/migrate-contractor-statuses.mjs --apply
 *
 * "New" is NOT blindly merged into "Applied": the CSV import that set it was
 * used for spreadsheets of existing workers, and "Applied" feeds the daily
 * stale-applicant escalation. So a "New" contractor becomes:
 *   - Active   if they have live work (the rule automation would apply anyway)
 *   - Applied  if they have never had an assignment or a portal login
 *   - Inactive otherwise (worked before, nothing live now)
 *
 * Output is PII-free: counts only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/migrate-contractor-statuses.mjs\n");
  process.exit(2);
}

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

// Copy of LIVE_ASSIGNMENT_STATUSES in src/lib/assignment-statuses.ts (plain
// node cannot import the .ts file). Checked in step on 2026-09-27.
const LIVE = ["Placed", "Active", "Ending", "Holiday"];

const RETIRED_TO_INACTIVE = ["On Hold", "Suspended", "Left"];

const byStatus = await prisma.contractor.groupBy({ by: ["status"], _count: { _all: true } });
console.log("Current statuses:");
for (const row of byStatus.sort((a, b) => b._count._all - a._count._all)) {
  console.log(`  ${row.status.padEnd(12)} ${row._count._all}`);
}

const retired = await prisma.contractor.findMany({
  where: { status: { in: RETIRED_TO_INACTIVE } },
  select: { id: true, status: true, assignments: { where: { status: { in: LIVE } }, select: { id: true } } },
});
const retiredLive = retired.filter((c) => c.assignments.length > 0);

const news = await prisma.contractor.findMany({
  where: { status: "New" },
  select: {
    id: true,
    contractorLogin: { select: { id: true } },
    _count: { select: { assignments: true } },
    assignments: { where: { status: { in: LIVE } }, select: { id: true } },
  },
});
const newToActive = news.filter((c) => c.assignments.length > 0);
const newToApplied = news.filter((c) => c.assignments.length === 0 && c._count.assignments === 0 && !c.contractorLogin);
const newToInactive = news.filter((c) => !newToActive.includes(c) && !newToApplied.includes(c));

console.log("\nPlan:");
console.log(`  On Hold/Suspended/Left -> Inactive: ${retired.length}` +
  (retiredLive.length ? `  (${retiredLive.length} of them have LIVE work -> Active instead)` : ""));
console.log(`  New -> Active   (live work):                 ${newToActive.length}`);
console.log(`  New -> Applied  (no jobs ever, no login):    ${newToApplied.length}`);
console.log(`  New -> Inactive (worked before / has login): ${newToInactive.length}`);

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply.");
} else {
  const ids = (rows) => rows.map((r) => r.id);
  const retiredIdle = retired.filter((c) => c.assignments.length === 0);
  const results = await prisma.$transaction([
    prisma.contractor.updateMany({ where: { id: { in: ids(retiredIdle) } }, data: { status: "Inactive" } }),
    prisma.contractor.updateMany({ where: { id: { in: ids(retiredLive) } }, data: { status: "Active" } }),
    prisma.contractor.updateMany({ where: { id: { in: ids(newToActive) } }, data: { status: "Active" } }),
    prisma.contractor.updateMany({ where: { id: { in: ids(newToApplied) } }, data: { status: "Applied" } }),
    prisma.contractor.updateMany({ where: { id: { in: ids(newToInactive) } }, data: { status: "Inactive" } }),
    prisma.activityLog.create({
      data: {
        action: "UPDATE",
        entityType: "Contractor",
        entityId: "bulk-status-cleanup-2026-09-27",
        details: `Status clean-up: On Hold/Suspended/Left and New retired. ${retired.length + news.length} contractors moved.`,
        userEmail: "system",
      },
    }),
  ]);
  console.log(`\nWritten: ${results.slice(0, 5).map((r) => r.count).join(" / ")} (retired-idle / retired-live / new-active / new-applied / new-inactive)`);
}

await prisma.$disconnect();
