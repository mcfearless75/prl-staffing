/**
 * Reconciles the contractor headcounts that appear across PRISM.
 *
 *     railway run --service Postgres node scripts/reconcile-workforce.mjs
 *
 * Written because the compliance page shows "415 subcontractors currently
 * placed" alongside "whole book (424)" while most of the book is Inactive —
 * numbers that cannot all be describing the same people.
 *
 * Three different denominators are in use:
 *   - contractor.count()                                   every row ever
 *   - contractor.count({ status notIn [Left, Inactive] })  the "whole book" figure
 *   - distinct contractorId on Placed/Active/Ending        the "assigned" figure,
 *                                                          which has NO status filter
 *
 * The last one is the problem: a contractor marked Inactive whose assignment was
 * never closed still counts as currently placed.
 *
 * PII-free: counts only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/reconcile-workforce.mjs\n");
  process.exit(2);
}

const prisma = new PrismaClient();
const LIVE_ASSIGNMENT = ["Placed", "Active", "Ending"];

const [byStatus, byAssignmentStatus, liveAssignments, total] = await Promise.all([
  prisma.contractor.groupBy({ by: ["status"], _count: true }),
  prisma.assignment.groupBy({ by: ["status"], _count: true }),
  prisma.assignment.findMany({
    where: { status: { in: LIVE_ASSIGNMENT } },
    select: { contractorId: true, contractor: { select: { status: true } } },
  }),
  prisma.contractor.count(),
]);

console.log("\n==============================================");
console.log("  Workforce reconciliation");
console.log("==============================================\n");

console.log("Contractor.status distribution:");
for (const r of byStatus.sort((a, b) => b._count - a._count)) {
  console.log(`  ${String(r.status ?? "(null)").padEnd(14)} ${String(r._count).padStart(5)}`);
}
console.log(`  ${"TOTAL".padEnd(14)} ${String(total).padStart(5)}`);

console.log("\nAssignment.status distribution:");
for (const r of byAssignmentStatus.sort((a, b) => b._count - a._count)) {
  console.log(`  ${String(r.status ?? "(null)").padEnd(14)} ${String(r._count).padStart(5)}`);
}

// The headline figures, each with its own rule.
const notLeftOrInactive = byStatus
  .filter((r) => !["Left", "Inactive"].includes(r.status))
  .reduce((n, r) => n + r._count, 0);

const assignedIds = new Set(liveAssignments.map((a) => a.contractorId));

// Split the "assigned" set by the contractor's own status — this is the leak.
const assignedByStatus = {};
for (const a of liveAssignments) {
  if (!assignedByStatus[a.contractor.status]) assignedByStatus[a.contractor.status] = new Set();
  assignedByStatus[a.contractor.status].add(a.contractorId);
}

console.log("\n----------------------------------------------");
console.log("The three headline numbers:");
console.log(`  every contractor row:                       ${total}`);
console.log(`  "whole book" (not Left/Inactive):           ${notLeftOrInactive}`);
console.log(`  "currently placed" (live assignment, ANY status): ${assignedIds.size}`);

console.log("\nThat 'currently placed' figure, split by contractor status:");
let stale = 0;
for (const st of Object.keys(assignedByStatus).sort(
  (a, b) => assignedByStatus[b].size - assignedByStatus[a].size
)) {
  const n = assignedByStatus[st].size;
  const flag = ["Left", "Inactive"].includes(st) ? "   <-- counted but not working" : "";
  if (["Left", "Inactive"].includes(st)) stale += n;
  console.log(`  ${st.padEnd(14)} ${String(n).padStart(5)}${flag}`);
}

// Which assignment status is keeping the stale ones alive? The deactivation
// helper counts only {Placed, Active} as live, while the headcount queries count
// {Placed, Active, Ending}. So a contractor whose last assignment is "Ending"
// gets marked Inactive by the former and still counted as placed by the latter.
if (stale) {
  const staleRows = await prisma.assignment.findMany({
    where: {
      status: { in: LIVE_ASSIGNMENT },
      contractor: { status: { in: ["Left", "Inactive"] } },
    },
    select: { status: true, contractor: { select: { status: true } } },
  });
  const combo = {};
  for (const r of staleRows) {
    const k = `assignment=${r.status} + contractor=${r.contractor.status}`;
    combo[k] = (combo[k] || 0) + 1;
  }
  console.log("\nstale combinations:");
  for (const k of Object.keys(combo).sort()) console.log(`  ${k}  x${combo[k]}`);
  const endingOnly = staleRows.filter((r) => r.status === "Ending").length;
  if (endingOnly) {
    console.log(`\n  ${endingOnly} of these are "Ending" — that is the definition`);
    console.log("  mismatch, not bad data: GATED_STATUSES omits Ending.");
  }
}

console.log("\n----------------------------------------------");
if (stale) {
  console.log(`  ${stale} contractor(s) are Left/Inactive but still hold a live`);
  console.log("  assignment, so they inflate every 'assigned workforce' figure");
  console.log("  and drag the compliance score down for people who are not");
  console.log("  actually placed. Closing those assignments is the fix.");
} else {
  console.log("  No stale assignments — every placed contractor is active.");
}
console.log("==============================================\n");

await prisma.$disconnect();
