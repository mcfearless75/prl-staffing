/**
 * Removes the TEST/demo records deliberately left in production as proof during
 * the 2026-07-29 public-form audit. They are visible to staff and the client, so
 * they need clearing once they have served their purpose.
 *
 * Dry run (default — lists what WOULD go, changes nothing):
 *     railway run --service Postgres node scripts/purge-demo-records.mjs
 *
 * Execute:
 *     railway run --service Postgres node scripts/purge-demo-records.mjs --confirm
 *
 * Deliberately operates on an explicit allowlist of ticket numbers, never a
 * pattern match — a LIKE '%TEST%' sweep against production risks taking real
 * records that happen to mention the word.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("\n  No database URL. Run via: railway run --service Postgres node scripts/purge-demo-records.mjs\n");
  process.exit(2);
}

const CONFIRM = process.argv.includes("--confirm");

// Recorded in the 2026-07-29 audit as demo proof.
const TARGETS = [
  { model: "paymentQuery", label: "PaymentQuery", tickets: ["PQ-003", "PQ-004"] },
  { model: "grievance",    label: "Grievance",    tickets: ["GRV-001", "GRV-002"] },
];

const prisma = new PrismaClient();

console.log("\n==============================================");
console.log(`  Demo record purge — ${CONFIRM ? "EXECUTING" : "DRY RUN"}`);
console.log("==============================================\n");

let found = 0;
let removed = 0;

for (const t of TARGETS) {
  const rows = await prisma[t.model].findMany({
    where: { ticketNumber: { in: t.tickets } },
    // Ticket number, status and date only — never names or free-text answers.
    select: { id: true, ticketNumber: true, status: true, createdAt: true },
    orderBy: { ticketNumber: "asc" },
  });

  console.log(`${t.label}: ${rows.length} of ${t.tickets.length} target ticket(s) present`);
  for (const r of rows) {
    console.log(`   ${r.ticketNumber}  status=${r.status}  created=${r.createdAt.toISOString().slice(0, 10)}`);
  }
  found += rows.length;

  if (CONFIRM && rows.length) {
    try {
      const res = await prisma[t.model].deleteMany({
        where: { ticketNumber: { in: rows.map((r) => r.ticketNumber) } },
      });
      removed += res.count;
      console.log(`   -> deleted ${res.count}`);
    } catch (err) {
      // Most likely a foreign-key constraint from a related comment/assignment
      // row. Report it rather than cascading blindly through live data.
      console.log(`   -> DELETE FAILED: ${err.message.split("\n")[0]}`);
    }
  }
  console.log();
}

// Remaining totals, so the effect is visible rather than asserted.
const pq = await prisma.paymentQuery.count();
const grv = await prisma.grievance.count();

console.log("----------------------------------------------");
if (!CONFIRM) {
  console.log(`  ${found} demo record(s) would be removed. Nothing changed.`);
  console.log("  Re-run with --confirm to execute.");
} else {
  console.log(`  ${removed} of ${found} demo record(s) removed.`);
}
console.log(`  Remaining: PaymentQuery=${pq}, Grievance=${grv}`);
console.log("==============================================\n");

await prisma.$disconnect();
