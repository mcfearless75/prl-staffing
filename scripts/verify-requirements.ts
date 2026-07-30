/**
 * End-to-end check of per-role compliance requirements against live data,
 * exercising the SAME code the app uses — not a reimplementation of it.
 *
 *     railway run --service Postgres npx tsx scripts/verify-requirements.ts
 *
 * Answers three things that are easy to get wrong and impossible to see from
 * an empty screen:
 *   1. do the configured rules actually match anybody?
 *   2. how much of the workforce is covered, and who is unreachable?
 *   3. what does the resulting gap list look like?
 *
 * PII-free: counts, roles and document types only — never contractor names.
 */

import { getComplianceGapSummary, loadRequirementMatcher } from "../src/lib/compliance-gaps";
import { getComplianceScore } from "../src/lib/compliance-score";
import { prisma } from "../src/lib/db";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres npx tsx scripts/verify-requirements.ts");
  process.exit(1);
}

async function main() {
  const matcher = await loadRequirementMatcher();
  const requirements = await prisma.complianceRequirement.findMany({
    orderBy: [{ role: "asc" }, { type: "asc" }],
  });

  console.log(`\n=== CONFIGURED REQUIREMENTS ===`);
  console.log(`configured: ${matcher.configured}   rows: ${requirements.length}`);
  for (const r of requirements) {
    console.log(`  ${r.role.padEnd(16)} ${r.type.padEnd(34)} ${r.isMandatory ? "mandatory" : "optional"}`);
  }

  // Spot-check the two roles the client named, plus an unroled contractor.
  console.log(`\n=== CHECKLIST RESOLUTION SPOT CHECKS ===`);
  for (const [label, role, jobTitle] of [
    ["Joiner (exact)", "Joiner", null],
    ["Joiner Nights (variant + shift)", "Joiner Nights", null],
    ["Groundworker", "Groundworker", null],
    ["blank role, jobTitle Groundworker", "", "Groundworker"],
    ["blank role, no job title", "", null],
    ["Electrician (no rule configured)", "Electrician", null],
  ] as [string, string, string | null][]) {
    const list = matcher.forRole(role, jobTitle);
    console.log(`  ${label}`);
    console.log(`    -> ${list.length ? list.map((l) => l.type).join(", ") : "(nothing required)"}`);
  }

  const summary = await getComplianceGapSummary();

  console.log(`\n=== WORKFORCE COVERAGE ===`);
  console.log(`  role known:   ${summary.contractorsWithKnownRole}`);
  console.log(`  role unknown: ${summary.contractorsWithUnknownRole}`);
  console.log(`  roles in use with NO checklist configured: ${summary.rolesWithoutRequirements.length}`);
  for (const r of summary.rolesWithoutRequirements.slice(0, 10)) {
    console.log(`    ${String(r.contractors).padStart(4)}  ${r.role}`);
  }
  if (summary.rolesWithoutRequirements.length > 10) {
    console.log(`    ... and ${summary.rolesWithoutRequirements.length - 10} more`);
  }

  console.log(`\n=== GAPS ===`);
  console.log(`  total gap rows: ${summary.gaps.length}`);

  const byType = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byRole = new Map<string, number>();
  const contractors = new Set<string>();
  for (const g of summary.gaps) {
    byType.set(g.requiredType, (byType.get(g.requiredType) ?? 0) + 1);
    byStatus.set(g.status, (byStatus.get(g.status) ?? 0) + 1);
    byRole.set(g.assignmentRole, (byRole.get(g.assignmentRole) ?? 0) + 1);
    contractors.add(g.contractorId);
  }
  console.log(`  distinct contractors with >=1 gap: ${contractors.size}`);
  console.log(`  by status: ${[...byStatus].map(([k, v]) => `${k}=${v}`).join("  ")}`);
  console.log(`  by document type:`);
  for (const [t, n] of [...byType].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(4)}  ${t}`);
  }
  console.log(`  top roles by gap count:`);
  for (const [r, n] of [...byRole].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    console.log(`    ${String(n).padStart(4)}  ${r}`);
  }

  // The headline number, from the same function the dashboard calls.
  const score = await getComplianceScore();
  console.log(`\n=== HEADLINE SCORE (src/lib/compliance-score.ts) ===`);
  console.log(`  assigned workforce:  ${score.assignedTotal}`);
  console.log(`  fully compliant:     ${score.fullyCompliant}`);
  console.log(`  action required:     ${score.actionRequired}`);
  console.log(`  pending review:      ${score.pendingReview}`);
  console.log(`  expiring:            ${score.expiring}`);
  console.log(`  no records at all:   ${score.noRecords}`);
  console.log(`  no requirements set: ${score.noRequirements}`);
  console.log(`  unknown role:        ${score.unknownRole}`);
  console.log(`  SCORE:               ${score.score}%`);

  // The failure mode this whole exercise exists to prevent.
  const roleSpecific = summary.gaps.filter((g) => g.assignmentRole !== "Unknown");
  console.log(`\n  gaps attributed to a known role: ${roleSpecific.length}`);
  if (matcher.configured && summary.gaps.length === 0) {
    console.log(`\n  WARNING: requirements are configured but matched NOBODY.`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
