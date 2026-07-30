/**
 * Checks that every name in the JobRole table resolves to a canonical role.
 *
 *     railway run --service Postgres npx tsx scripts/check-jobrole-alignment.ts
 *
 * Matters because /apply now offers JobRole rows as the role picker, so those
 * exact strings land on contractor records and then have to match compliance
 * requirements. A JobRole name that does not resolve is a role whose
 * requirements would silently never apply.
 *
 * PII-free: role names only.
 */

import { PrismaClient } from "@prisma/client";
import { CANONICAL_ROLES, normaliseRole } from "../src/lib/role-normalisation";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres npx tsx scripts/check-jobrole-alignment.ts");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const jobRoles = await prisma.jobRole.findMany({
    select: { name: true, active: true },
    orderBy: { name: "asc" },
  });

  const unresolved: string[] = [];
  const renamed: { from: string; to: string }[] = [];

  for (const jr of jobRoles) {
    const { canonical } = normaliseRole(jr.name);
    if (!canonical || !CANONICAL_ROLES.includes(canonical)) {
      unresolved.push(jr.name);
    } else if (canonical !== jr.name) {
      renamed.push({ from: jr.name, to: canonical });
    }
  }

  console.log(`\n=== JobRole -> canonical alignment ===`);
  console.log(`JobRole rows: ${jobRoles.length}`);
  console.log(`resolve exactly:      ${jobRoles.length - unresolved.length - renamed.length}`);
  console.log(`resolve via an alias: ${renamed.length}`);
  console.log(`DO NOT RESOLVE:       ${unresolved.length}`);

  if (renamed.length) {
    console.log(`\nMapped through an alias (fine, but the two vocabularies differ):`);
    for (const r of renamed) console.log(`  ${JSON.stringify(r.from)} -> ${JSON.stringify(r.to)}`);
  }

  if (unresolved.length) {
    console.log(`\nUNRESOLVED — requirements for these would never apply:`);
    for (const u of unresolved) console.log(`  ${JSON.stringify(u)}`);
    console.log(`\nAdd them to CANONICAL_ROLES in src/lib/role-normalisation.ts.`);
    process.exitCode = 1;
  } else {
    console.log(`\nAll JobRole names resolve. Roles chosen on /apply will match requirements.\n`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
