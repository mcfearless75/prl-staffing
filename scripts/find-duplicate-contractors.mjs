/**
 * Finds subcontractors who look like the same person recorded twice.
 *
 *     railway run --service Postgres node scripts/find-duplicate-contractors.mjs
 *     railway run --service Postgres node scripts/find-duplicate-contractors.mjs --all
 *
 * Written alongside the duplicate checks now guarding /apply and /onboarding.
 * Those stop NEW duplicates; this one finds the ones already in the book.
 *
 * `Contractor.email` is unique, so a duplicate can only exist under a second
 * address — which is exactly why nothing caught them. Matching therefore has to
 * work on NI number, phone, name and date of birth, all of which are free text
 * in this database and stored in several shapes ("AB123456C" vs "AB 12 34 56
 * C", "+447700900123" vs "07700 900123").
 *
 * Matching rules are imported from src/lib/duplicate-check.ts rather than
 * copied, so this report and the live forms can never drift apart. That file is
 * covered by tests/duplicate-check.test.ts.
 *
 * By default only `exact` and `strong` pairs are printed, because name-only
 * matches are mostly genuine namesakes and drown the real findings. Pass --all
 * to see those too.
 *
 * PII: prints names, emails and a MASKED NI number, because a merge decision
 * cannot be made without knowing who. Do not paste the output anywhere public.
 */

import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("tsx/cjs");
const {
  findPotentialDuplicates,
  describeReasons,
} = require("../src/lib/duplicate-check.ts");

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error(
    "\n  Run via: railway run --service Postgres node scripts/find-duplicate-contractors.mjs\n"
  );
  process.exit(2);
}

const showAll = process.argv.includes("--all");
const prisma = new PrismaClient();

/** Last three characters only — enough to tell two records apart, not to use. */
function maskNi(ni) {
  if (!ni) return "—";
  const v = String(ni).trim();
  return v.length <= 3 ? "***" : `${"*".repeat(v.length - 3)}${v.slice(-3)}`;
}

async function main() {
  const contractors = await prisma.contractor.findMany({
    select: {
      id: true,
      ref: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      niNumber: true,
      dateOfBirth: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nScanned ${contractors.length} subcontractor records.\n`);

  // Each pair once: compare every record only against those recorded later, so
  // A-B and B-A do not both appear.
  const pairs = [];
  for (let i = 0; i < contractors.length; i++) {
    const later = contractors.slice(i + 1);
    for (const m of findPotentialDuplicates(contractors[i], later)) {
      pairs.push({ a: contractors[i], b: m.record, reasons: m.reasons, confidence: m.confidence });
    }
  }

  const rank = { exact: 0, strong: 1, possible: 2 };
  pairs.sort((x, y) => rank[x.confidence] - rank[y.confidence]);

  const counts = { exact: 0, strong: 0, possible: 0 };
  for (const p of pairs) counts[p.confidence]++;

  const shown = showAll ? pairs : pairs.filter((p) => p.confidence !== "possible");

  if (shown.length === 0) {
    console.log("No duplicate subcontractors found at this confidence level.");
  }

  let current = "";
  for (const p of shown) {
    if (p.confidence !== current) {
      current = p.confidence;
      const heading = {
        exact: "EXACT — same NI number or same email. Almost certainly one person.",
        strong: "STRONG — same name and date of birth, or same phone number.",
        possible: "POSSIBLE — same name only. Usually genuine namesakes.",
      }[current];
      console.log(`\n${"=".repeat(74)}\n${heading}\n${"=".repeat(74)}`);
    }
    // Full id, never truncated: a record with no `ref` is identified only by
    // its id, and that id is what gets pasted into merge-contractors.mjs.
    // Printing the first 8 characters produced something that looked like a
    // reference but resolved to nothing.
    const line = (c) =>
      `    ${(c.ref || c.id).padEnd(26)} ${`${c.firstName} ${c.lastName}`.padEnd(28)} ` +
      `${(c.email || "—").padEnd(34)} NI ${maskNi(c.niNumber).padEnd(12)} ` +
      `${c.status.padEnd(9)} added ${c.createdAt.toISOString().slice(0, 10)}`;
    console.log(`\n  matched on ${describeReasons(p.reasons)}`);
    console.log(line(p.a));
    console.log(line(p.b));
  }

  console.log(
    `\n${"-".repeat(74)}\n` +
      `  exact:    ${counts.exact}\n` +
      `  strong:   ${counts.strong}\n` +
      `  possible: ${counts.possible}${showAll ? "" : "   (hidden — pass --all to list)"}\n` +
      `${"-".repeat(74)}\n`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
