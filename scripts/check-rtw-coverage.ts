/**
 * How many people the red Right to Work flag will show for, and why. Runs the
 * REAL rule (src/lib/rtw-flag.ts) over live data. Read-only, PII-free: counts.
 *
 *     railway run --service Postgres npx tsx scripts/check-rtw-coverage.ts
 */

import { PrismaClient } from "@prisma/client";
import { rtwCoverage } from "../src/lib/rtw-flag";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("Run via: railway run --service Postgres npx tsx scripts/check-rtw-coverage.ts");
  process.exit(1);
}

const prisma = new PrismaClient();
const LIVE = ["Placed", "Active", "Ending", "Holiday"];

async function main() {
  const people = await prisma.contractor.findMany({
    where: { status: { not: "Inactive" } },
    select: {
      status: true,
      compliances: { select: { type: true, status: true, expiryDate: true } },
      _count: { select: { assignments: { where: { status: { in: LIVE } } } } },
    },
  });

  const tally = new Map<string, { all: number; onSite: number }>();
  for (const p of people) {
    const { covered, reason } = rtwCoverage(p.compliances);
    const key = covered ? "Covered" : reason ?? "Not covered";
    const t = tally.get(key) ?? { all: 0, onSite: 0 };
    t.all++;
    if (p._count.assignments > 0) t.onSite++;
    tally.set(key, t);
  }

  console.log(`Not-Inactive contractors: ${people.length}\n`);
  for (const [k, t] of [...tally].sort((a, b) => b[1].all - a[1].all)) {
    console.log(`  ${k.padEnd(55)} ${String(t.all).padStart(4)}   (on live work: ${t.onSite})`);
  }
}

main().finally(() => prisma.$disconnect());
