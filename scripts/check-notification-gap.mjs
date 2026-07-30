/**
 * Shows submissions and notification emails on one timeline, so a parity
 * failure can be pinned to a window rather than guessed at.
 *
 *     railway run --service Postgres node scripts/check-notification-gap.mjs
 *
 * smoke-prism.mjs reports THAT submissions outnumber notifications. This shows
 * WHICH ones and WHEN, which is what you need to correlate against a deploy.
 *
 * PII-free: timestamps, statuses and template names only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/check-notification-gap.mjs\n");
  process.exit(2);
}

const prisma = new PrismaClient();
const since = new Date(Date.now() - 36 * 3600 * 1000);
const t = (d) => d.toISOString().slice(0, 16).replace("T", " ");

const [contractors, emails] = await Promise.all([
  prisma.contractor.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, status: true, notes: true },
  }),
  prisma.emailLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, template: true, status: true, provider: true },
  }),
]);

console.log("\n==============================================");
console.log("  Submissions vs notifications — last 36h");
console.log("==============================================\n");

const events = [
  ...contractors.map((c) => {
    // Contractor rows are created by /apply, by staff on /contractors/new, and
    // by bulk import. Only the first should ever produce an application email,
    // so they must be told apart. /apply is the only path that writes a JSON
    // application blob into notes and sets status "Applied".
    let blob = false;
    try {
      blob = typeof c.notes === "string" && typeof JSON.parse(c.notes) === "object" && c.notes.trim() !== "";
    } catch {
      blob = false;
    }
    const viaApply = blob || c.status === "Applied";
    return {
      at: c.createdAt,
      kind: viaApply ? "APPLICATION" : "contractor-added",
      detail: `status=${c.status} applicationBlob=${blob ? "yes" : "no"}`,
      viaApply,
    };
  }),
  ...emails.map((e) => ({
    at: e.createdAt,
    kind: "EMAIL",
    detail: `${e.template} ${e.status} via ${e.provider ?? "?"}`,
  })),
].sort((a, b) => a.at - b.at);

if (!events.length) console.log("  (nothing in the window)");
for (const e of events) {
  console.log(`  ${t(e.at)}  ${e.kind.padEnd(12)} ${e.detail}`);
}

const apps = events.filter((e) => e.viaApply).length;
const added = contractors.length - apps;
const notified = emails.filter((e) => e.template === "application-received").length;
console.log("\n----------------------------------------------");
console.log(`  via /apply: ${apps}   added by staff/import: ${added}`);
console.log(`  application-received emails: ${notified}`);
if (apps > notified) {
  console.log(`  GAP: ${apps - notified} application(s) with no notification.`);
  console.log("  sendEmail() writes an EmailLog row on success AND failure, so a");
  console.log("  missing row means it was never reached — an early return or a");
  console.log("  throw before it, not a delivery failure.");
}
console.log("==============================================\n");

await prisma.$disconnect();
