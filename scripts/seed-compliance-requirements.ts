/**
 * Seeds a starter set of per-role compliance requirements.
 *
 * Dry-run by default — prints what it WOULD create and changes nothing:
 *     railway run --service Postgres npx tsx scripts/seed-compliance-requirements.ts
 * Apply:
 *     railway run --service Postgres npx tsx scripts/seed-compliance-requirements.ts --confirm
 *
 * Type strings are validated against the canonical taxonomy before anything is
 * written, because a requirement is matched against ComplianceRecord.type by
 * exact string. "CSCS (Blue) - Skilled Worker" with a hyphen does not match the
 * stored "CSCS (Blue) — Skilled Worker" with an em dash, and the resulting rule
 * would look configured while matching nobody.
 *
 * Additive and idempotent: skipDuplicates on the [role, companyId, type] unique
 * constraint, and nothing is ever deleted.
 */

import { PrismaClient } from "@prisma/client";
import { COMPLIANCE_TYPES, isValidComplianceType } from "../src/lib/compliance-types";
import { CANONICAL_ROLES, normaliseRole } from "../src/lib/role-normalisation";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL not set. Run via: railway run --service Postgres npx tsx scripts/seed-compliance-requirements.ts"
  );
  process.exit(1);
}

const CONFIRM = process.argv.includes("--confirm");
const prisma = new PrismaClient();

type Seed = {
  role: string;
  types: { type: string; isMandatory?: boolean; description?: string }[];
  note: string;
};

/**
 * Jen's worked examples, plus the baseline everybody needs.
 *
 * Deliberately small. This is a starting point for PRL to extend in the UI, not
 * an attempt to guess the whole matrix — getting a Groundworker's plant tickets
 * wrong in bulk would be worse than leaving them unconfigured.
 */
const SEEDS: Seed[] = [
  {
    role: "All",
    note: "Baseline — legally required of everyone regardless of trade.",
    types: [
      {
        type: "Right to Work",
        description: "Passport, share code, or other proof of eligibility to work in the UK",
      },
    ],
  },
  {
    role: "Joiner",
    note: "Jen's example: CSCS blue card plus passport/right to work.",
    types: [
      { type: "CSCS (Blue) — Skilled Worker", description: "Blue skilled worker card" },
      { type: "Right to Work" },
    ],
  },
  {
    role: "Groundworker",
    note: "Jen's example: CSCS blue and an NPORS card alongside passport/right to work.",
    types: [
      { type: "CSCS (Blue) — Skilled Worker", description: "Blue skilled worker card" },
      {
        type: "NPORS",
        description: "NPORS card for the plant operated — specific category varies by site",
      },
      { type: "Right to Work" },
    ],
  },
];

function validate(): string[] {
  const errors: string[] = [];
  for (const seed of SEEDS) {
    if (seed.role !== "All") {
      if (!CANONICAL_ROLES.includes(seed.role)) {
        errors.push(`Role "${seed.role}" is not in the canonical vocabulary.`);
      }
      const { canonical } = normaliseRole(seed.role);
      if (canonical !== seed.role) {
        errors.push(`Role "${seed.role}" normalises to "${canonical}" — store the canonical form.`);
      }
    }
    for (const t of seed.types) {
      if (!isValidComplianceType(t.type)) {
        const near = COMPLIANCE_TYPES.filter((c) =>
          c.toLowerCase().includes(t.type.toLowerCase().slice(0, 6))
        ).slice(0, 3);
        errors.push(
          `Type "${t.type}" is not in the taxonomy.` +
            (near.length ? ` Did you mean: ${near.map((n) => `"${n}"`).join(", ")}?` : "")
        );
      }
    }
  }
  return errors;
}

async function main() {
  const errors = validate();
  if (errors.length) {
    console.error("\nVALIDATION FAILED — nothing written:\n");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Validation passed: every role and document type exists in the taxonomy.\n");

  const existing = await prisma.complianceRequirement.findMany({
    select: { role: true, type: true, companyId: true },
  });
  const existingKeys = new Set(existing.map((r) => `${r.role}|${r.companyId ?? ""}|${r.type}`));

  const rows = SEEDS.flatMap((seed) =>
    seed.types.map((t) => ({
      role: seed.role,
      companyId: null as string | null,
      type: t.type,
      description: t.description ?? null,
      isMandatory: t.isMandatory ?? true,
    }))
  );

  const toCreate = rows.filter((r) => !existingKeys.has(`${r.role}|${""}|${r.type}`));
  const skipped = rows.length - toCreate.length;

  for (const seed of SEEDS) {
    console.log(`${seed.role}`);
    console.log(`  ${seed.note}`);
    for (const t of seed.types) {
      const already = existingKeys.has(`${seed.role}||${t.type}`);
      console.log(`    ${already ? "exists  " : CONFIRM ? "CREATE  " : "would add"} ${t.type}`);
    }
    console.log("");
  }

  console.log(`Existing requirement rows: ${existing.length}`);
  console.log(`To create: ${toCreate.length}   already present: ${skipped}`);

  if (!CONFIRM) {
    console.log("\nDRY RUN — nothing written. Re-run with --confirm to apply.\n");
    return;
  }

  if (toCreate.length === 0) {
    console.log("\nNothing to do.\n");
    return;
  }

  const result = await prisma.complianceRequirement.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  console.log(`\nCreated ${result.count} requirement rows.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
