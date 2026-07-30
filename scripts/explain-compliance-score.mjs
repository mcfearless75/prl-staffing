/**
 * Explains how the headline compliance percentage is arrived at, with live
 * numbers. Written to answer a recurring client question: "does it expect every
 * subcontractor to have every document, and is that why the score is low?"
 *
 *     railway run --service Postgres node scripts/explain-compliance-score.mjs
 *
 * The score (src/app/(dashboard)/page.tsx and /compliance) is:
 *
 *     fullyCompliant / assignedTotal * 100
 *
 * where assignedTotal = distinct contractors on Placed/Active/Ending assignments,
 * and a contractor is fullyCompliant only if EVERY compliance record they hold is
 * "Verified". Two consequences people find surprising:
 *
 *   - It does NOT check a required document set. A contractor holding one
 *     verified CSCS and nothing else scores as fully compliant.
 *   - A contractor with NO records at all is counted as not compliant, so empty
 *     records drag the score down just as hard as expired ones.
 *
 * Separately, ComplianceRequirement DOES model per-role and per-client required
 * documents, and drives the Gap Report — but not this percentage.
 *
 * PII-free: counts only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/explain-compliance-score.mjs\n");
  process.exit(2);
}

const prisma = new PrismaClient();

const [assignments, allRecords, requirements, totalContractors] = await Promise.all([
  prisma.assignment.findMany({
    where: { status: { in: ["Placed", "Active", "Ending"] } },
    select: { contractorId: true, role: true },
  }),
  prisma.complianceRecord.findMany({ select: { contractorId: true, status: true, type: true } }),
  prisma.complianceRequirement.findMany({
    select: { role: true, type: true, isMandatory: true, companyId: true },
  }),
  prisma.contractor.count(),
]);

const assignedIds = new Set(assignments.map((a) => a.contractorId));
const assignedTotal = assignedIds.size;

const byContractor = new Map();
for (const r of allRecords) {
  if (!assignedIds.has(r.contractorId)) continue;
  if (!byContractor.has(r.contractorId)) byContractor.set(r.contractorId, []);
  byContractor.get(r.contractorId).push(r.status);
}

let fully = 0, expiring = 0, actionRequired = 0;
for (const [, statuses] of byContractor) {
  if (statuses.some((s) => s === "Expired" || s === "Non-Compliant")) actionRequired++;
  else if (statuses.some((s) => s === "Expiring")) expiring++;
  else if (statuses.every((s) => s === "Verified")) fully++;
}
const noRecords = assignedTotal - byContractor.size;
const score = assignedTotal ? Math.round((fully / assignedTotal) * 100) : 0;

console.log("\n==============================================");
console.log("  How the compliance percentage is calculated");
console.log("==============================================\n");
console.log(`assigned workforce (the denominator):  ${assignedTotal}`);
console.log(`  of a total book of:                  ${totalContractors} subcontractors\n`);
console.log(`fully compliant (every record Verified): ${fully}`);
console.log(`has an Expiring record:                  ${expiring}`);
console.log(`has an Expired / Non-Compliant record:   ${actionRequired}`);
console.log(`has NO compliance records at all:        ${noRecords}`);
console.log(`\nSCORE = ${fully} / ${assignedTotal} = ${score}%`);

// Which factor actually costs the most percentage points?
if (assignedTotal) {
  const lostToEmpty = Math.round((noRecords / assignedTotal) * 100);
  const lostToExpired = Math.round((actionRequired / assignedTotal) * 100);
  const lostToExpiring = Math.round((expiring / assignedTotal) * 100);
  console.log("\nwhere the missing percentage actually goes:");
  console.log(`  no records at all:        -${lostToEmpty} points   <- usually the big one`);
  console.log(`  expired / non-compliant:  -${lostToExpired} points`);
  console.log(`  expiring soon:            -${lostToExpiring} points`);
}

console.log("\n----------------------------------------------");
console.log("Per-role requirements (ComplianceRequirement table)");
console.log("----------------------------------------------");
console.log(`requirement rows configured: ${requirements.length}`);
if (!requirements.length) {
  console.log("  EMPTY. Per-role requirements are supported by the code but");
  console.log("  none are configured, so the Gap Report has nothing to check");
  console.log("  against and no role-specific rules are being enforced.");
} else {
  const byRole = {};
  for (const r of requirements) {
    byRole[r.role] = byRole[r.role] || [];
    byRole[r.role].push(r.type + (r.isMandatory ? "" : " (optional)"));
  }
  for (const role of Object.keys(byRole).sort()) {
    console.log(`  ${role}: ${byRole[role].join(", ")}`);
  }
}

// Distinct assignment roles in use — the list that would need requirements.
const roles = [...new Set(assignments.map((a) => a.role).filter(Boolean))].sort();
console.log(`\ndistinct roles on active assignments: ${roles.length}`);
roles.slice(0, 40).forEach((r) => console.log("  - " + r));

console.log("\n==============================================\n");
await prisma.$disconnect();
