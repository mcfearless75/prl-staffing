/**
 * Runs the REAL role resolver (src/lib/role-normalisation.ts) over live
 * assignment data and reports how much of the assigned workforce a per-role
 * compliance requirement could actually reach.
 *
 *     railway run --service Postgres npx tsx scripts/check-role-resolution.ts
 *
 * This is the check that stops us shipping requirements that look configured
 * but never match. PII-free: role strings and counts only.
 */

import { PrismaClient } from "@prisma/client";
import { resolveRole, CANONICAL_ROLES } from "../src/lib/role-normalisation";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres npx tsx scripts/check-role-resolution.ts");
  process.exit(1);
}

const prisma = new PrismaClient();
const ACTIVE = ["Placed", "Active", "Ending"];

async function main() {
  const assignments = await prisma.assignment.findMany({
    where: { status: { in: ACTIVE } },
    select: {
      role: true,
      contractorId: true,
      contractor: { select: { jobTitle: true } },
    },
  });

  // One resolved role per contractor (first assignment that yields a role wins).
  const byContractor = new Map<string, ReturnType<typeof resolveRole>>();
  for (const a of assignments) {
    const existing = byContractor.get(a.contractorId);
    if (existing?.canonical) continue;
    byContractor.set(a.contractorId, resolveRole(a.role, a.contractor.jobTitle));
  }

  const resolved = [...byContractor.values()];
  const known = resolved.filter((r) => r.canonical);
  const unknown = resolved.filter((r) => !r.canonical);
  const review = known.filter((r) => r.needsReview);
  const fromTitle = known.filter((r) => r.source === "jobTitle");

  console.log(`\n=== ROLE RESOLUTION vs LIVE DATA ===`);
  console.log(`assigned contractors:            ${resolved.length}`);
  console.log(`  role resolved:                 ${known.length} (${Math.round((known.length / resolved.length) * 100)}%)`);
  console.log(`    via assignment role:         ${known.length - fromTitle.length}`);
  console.log(`    via contractor job title:    ${fromTitle.length}`);
  console.log(`  no role known anywhere:        ${unknown.length}`);
  console.log(`  resolved but NEEDS REVIEW:     ${review.length}`);

  // Which canonical roles the workforce actually maps onto — this is the list
  // that needs requirements configured.
  const counts = new Map<string, { n: number; review: boolean }>();
  for (const r of known) {
    const cur = counts.get(r.canonical!) ?? { n: 0, review: false };
    cur.n += 1;
    cur.review = cur.review || r.needsReview;
    counts.set(r.canonical!, cur);
  }

  console.log(`\n=== CANONICAL ROLES IN USE (${counts.size}) ===`);
  for (const [role, { n, review: needsReview }] of [...counts.entries()].sort((a, b) => b[1].n - a[1].n)) {
    const known = CANONICAL_ROLES.includes(role);
    const flags = [needsReview ? "REVIEW" : "", known ? "" : "NOT-IN-VOCAB"].filter(Boolean).join(" ");
    console.log(`${String(n).padStart(4)}  ${role.padEnd(30)} ${flags}`);
  }

  // Anything landing outside the declared vocabulary is a gap in the mapping.
  const outside = [...counts.keys()].filter((r) => !CANONICAL_ROLES.includes(r));
  console.log(`\n=== RESOLVED TO A NAME OUTSIDE THE CANONICAL VOCABULARY: ${outside.length} ===`);
  for (const r of outside) console.log(`  ${JSON.stringify(r)} (${counts.get(r)!.n})`);

  console.log(
    `\nBefore: 173/${resolved.length} reachable by a per-role rule.` +
      `\nAfter:  ${known.length}/${resolved.length} reachable.` +
      `\nStill unreachable except by an "All" rule: ${unknown.length}.\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
