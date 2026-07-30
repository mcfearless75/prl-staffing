/**
 * Finds contractors who were sent a portal invite but never completed setup.
 *
 *     railway run --service Postgres node scripts/check-stuck-invites.mjs
 *
 * Why this matters: Contractor.inviteToken has no expiry field and nothing
 * checks one, so invite links stay valid forever. Password reset links DO
 * expire (PasswordResetToken.expiresAt). That means if any invite was emailed
 * with an apex URL (prismworkforce.online/set-password?token=...) rather than
 * www, the token is still good but the link returns 404 — GoDaddy's forwarder
 * rewrites every path to the www homepage. Those contractors cannot onboard and
 * would have no idea why.
 *
 * Output is PII-free: counts and dates only, never names or emails.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
if (!process.env.DATABASE_URL) {
  console.error("\n  Run via: railway run --service Postgres node scripts/check-stuck-invites.mjs\n");
  process.exit(2);
}

const prisma = new PrismaClient();
const day = (d) => (d ? d.toISOString().slice(0, 10) : "—");

const invited = await prisma.contractor.findMany({
  where: { inviteSentAt: { not: null } },
  select: {
    id: true,
    status: true,
    inviteSentAt: true,
    inviteOpenedAt: true,
    inviteToken: true,
    contractorLogin: { select: { id: true } },
  },
  orderBy: { inviteSentAt: "asc" },
});

const neverOpened = invited.filter((c) => !c.inviteOpenedAt);
const noLogin = invited.filter((c) => !c.contractorLogin);
const stuck = invited.filter((c) => !c.contractorLogin && c.inviteToken);

console.log("\n==============================================");
console.log("  Portal invites — completion check");
console.log("==============================================\n");
console.log(`invites sent:                 ${invited.length}`);
console.log(`  never recorded as opened:   ${neverOpened.length}`);
console.log(`  no portal login created:    ${noLogin.length}`);
console.log(`  STUCK (no login, token live): ${stuck.length}`);

if (invited.length) {
  console.log(`\ninvite date range: ${day(invited[0].inviteSentAt)} -> ${day(invited[invited.length - 1].inviteSentAt)}`);
}

if (stuck.length) {
  // Grouped by month so a cluster before the apex->www switch is visible.
  const byMonth = {};
  for (const c of stuck) {
    const m = c.inviteSentAt.toISOString().slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + 1;
  }
  console.log("\nstuck invites by month sent:");
  for (const m of Object.keys(byMonth).sort()) {
    console.log(`  ${m}  ${String(byMonth[m]).padStart(4)}`);
  }
  // Status matters before anyone considers resending: the 2026-07-27 dormant
  // sweep set ~200 contractors Inactive, and re-inviting those would be noise.
  const byStatus = {};
  for (const c of stuck) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  console.log("\nstuck invites by contractor status:");
  for (const s of Object.keys(byStatus).sort((a, b) => byStatus[b] - byStatus[a])) {
    console.log(`  ${s.padEnd(12)} ${String(byStatus[s]).padStart(4)}`);
  }

  console.log("\nEach still holds a valid, non-expiring token. If their email");
  console.log("carried an apex URL, the link 404s and they cannot onboard.");
  console.log("Resending an invite fixes them regardless of the cause, since");
  console.log("AUTH_URL now generates www links — but filter by status first.");
} else {
  console.log("\nNo stuck invites — nobody is blocked by the apex 404.");
}

console.log("\n==============================================\n");
await prisma.$disconnect();
