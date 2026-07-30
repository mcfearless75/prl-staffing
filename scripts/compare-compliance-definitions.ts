/**
 * Computes the headline compliance percentage under BOTH definitions, so the
 * choice between them is made against a number rather than an expectation.
 *
 *     railway run --service Postgres npx tsx scripts/compare-compliance-definitions.ts
 *
 * A. CURRENT — "every record the contractor holds is Verified".
 *    Checks no required set. Someone holding a single verified CSCS and nothing
 *    else counts as fully compliant. Someone holding nothing counts as not.
 *
 * B. PROPOSED — "every REQUIRED document is present and Verified", where the
 *    requirement set comes from the contractor's role.
 *
 * Read-only. PII-free: counts only.
 */

import { loadRequirementMatcher } from "../src/lib/compliance-gaps";
import { resolveRole } from "../src/lib/role-normalisation";
import { prisma } from "../src/lib/db";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres npx tsx scripts/compare-compliance-definitions.ts");
  process.exit(1);
}

const ACTIVE = ["Placed", "Active", "Ending"];
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

async function main() {
  const [assignments, matcher] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: { in: ACTIVE } },
      select: {
        role: true,
        companyId: true,
        contractorId: true,
        contractor: {
          select: {
            jobTitle: true,
            compliances: { select: { type: true, status: true } },
          },
        },
      },
    }),
    loadRequirementMatcher(),
  ]);

  // One entry per contractor.
  type Row = {
    records: { type: string; status: string }[];
    role: string | null;
    required: string[];
  };
  const byContractor = new Map<string, Row>();

  for (const a of assignments) {
    const existing = byContractor.get(a.contractorId);
    if (existing?.role) continue;
    const resolved = resolveRole(a.role, a.contractor.jobTitle);
    byContractor.set(a.contractorId, {
      records: a.contractor.compliances,
      role: resolved.canonical,
      required: matcher
        .forRole(a.role, a.contractor.jobTitle, a.companyId)
        .filter((r) => r.isMandatory)
        .map((r) => r.type),
    });
  }

  const rows = [...byContractor.values()];
  const total = rows.length;

  // A — current definition
  let aCompliant = 0;
  let aNoRecords = 0;
  for (const r of rows) {
    if (r.records.length === 0) {
      aNoRecords++;
      continue;
    }
    if (r.records.every((x) => x.status === "Verified")) aCompliant++;
  }

  // B — proposed definition
  let bCompliant = 0;
  let bFailing = 0;
  let bNoRequirements = 0;
  for (const r of rows) {
    if (r.required.length === 0) {
      bNoRequirements++;
      continue;
    }
    const verified = new Set(
      r.records.filter((x) => x.status === "Verified").map((x) => x.type)
    );
    if (r.required.every((t) => verified.has(t))) bCompliant++;
    else bFailing++;
  }

  // Who changes verdict, and in which direction.
  let wouldFlipToFail = 0;
  let wouldFlipToPass = 0;
  for (const r of rows) {
    const aPass = r.records.length > 0 && r.records.every((x) => x.status === "Verified");
    const verified = new Set(
      r.records.filter((x) => x.status === "Verified").map((x) => x.type)
    );
    const bPass = r.required.length > 0 && r.required.every((t) => verified.has(t));
    if (aPass && !bPass) wouldFlipToFail++;
    if (!aPass && bPass) wouldFlipToPass++;
  }

  console.log(`\n=== HEADLINE COMPLIANCE SCORE — DEFINITION COMPARISON ===`);
  console.log(`assigned workforce: ${total}\n`);

  console.log(`A. CURRENT — "all held records verified"`);
  console.log(`   fully compliant: ${aCompliant}`);
  console.log(`   no records:      ${aNoRecords}`);
  console.log(`   SCORE:           ${pct(aCompliant, total)}%\n`);

  console.log(`B. PROPOSED — "all required documents present and verified"`);
  console.log(`   fully compliant: ${bCompliant}`);
  console.log(`   failing:         ${bFailing}`);
  console.log(`   no requirements configured for their role: ${bNoRequirements}`);
  console.log(`   SCORE (counting unconfigured as non-compliant): ${pct(bCompliant, total)}%`);
  console.log(`   SCORE (excluding unconfigured from both sides): ${pct(bCompliant, total - bNoRequirements)}%\n`);

  console.log(`CHANGE OF VERDICT`);
  console.log(`   pass -> fail: ${wouldFlipToFail}`);
  console.log(`   fail -> pass: ${wouldFlipToPass}`);
  console.log(`   net movement: ${pct(bCompliant, total) - pct(aCompliant, total)} points\n`);

  console.log(`NOTE: B moves whenever anyone edits the requirements, because the`);
  console.log(`denominator of "what's required" becomes configurable. Only ${matcher.allTypes.length}`);
  console.log(`document type(s) are configured today across ${bNoRequirements} unconfigured contractors.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
