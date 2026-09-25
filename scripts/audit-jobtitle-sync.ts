/**
 * Read-only: how far Contractor.jobTitle (the Subcontractors list column) has
 * drifted from Assignment.role (what the profile shows per placement).
 *
 *     railway run --service Postgres npx tsx scripts/audit-jobtitle-sync.ts
 *
 * PII-free: counts and role names only.
 */

import { PrismaClient } from "@prisma/client";
import { LIVE_ASSIGNMENT_STATUSES } from "../src/lib/assignment-statuses";
import { normaliseRole } from "../src/lib/role-normalisation";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via railway run --service Postgres ...");
  process.exit(1);
}

const prisma = new PrismaClient();
const live = new Set<string>(LIVE_ASSIGNMENT_STATUSES);
const norm = (s: string) => (normaliseRole(s).canonical || s).trim().toLowerCase();

async function main() {
  const contractors = await prisma.contractor.findMany({
    select: {
      jobTitle: true,
      status: true,
      notes: true,
      jobRoles: { select: { jobRole: { select: { name: true } } } },
      assignments: { select: { role: true, status: true, startDate: true }, orderBy: { startDate: "desc" } },
    },
  });

  const c = {
    total: contractors.length,
    blankTitle: 0,
    blankTitleWithLiveRole: 0,
    blankTitleWithOnlyPastRole: 0,
    blankTitleNoAssignments: 0,
    blankTitleWithProfileJobRoles: 0,
    blankTitleWithPositionsSought: 0,
    blankTitleNothingAnywhere: 0,
    blankTitleByStatus: {} as Record<string, number>,
    titleDiffersFromLiveRole: 0,
    titleMatchesLiveRole: 0,
    multipleLiveRoles: 0,
    liveRoleBlank: 0,
  };
  const diffs = new Map<string, number>();

  for (const k of contractors) {
    const title = (k.jobTitle || "").trim();
    const liveRoles = [...new Set(k.assignments.filter((a) => live.has(a.status)).map((a) => a.role.trim()))];
    const liveNonBlank = liveRoles.filter(Boolean);
    if (liveRoles.length && !liveNonBlank.length) c.liveRoleBlank++;
    if (liveNonBlank.length > 1) c.multipleLiveRoles++;
    const anyRole = k.assignments.map((a) => a.role.trim()).find(Boolean);

    if (!title) {
      c.blankTitle++;
      if (liveNonBlank.length) c.blankTitleWithLiveRole++;
      else if (anyRole) c.blankTitleWithOnlyPastRole++;
      else c.blankTitleNoAssignments++;
      c.blankTitleByStatus[k.status] = (c.blankTitleByStatus[k.status] || 0) + 1;
      let sought = "";
      try { const d = JSON.parse(k.notes || ""); sought = String(d?.positionsSought || "").trim(); } catch {}
      if (k.jobRoles.length) c.blankTitleWithProfileJobRoles++;
      if (sought) c.blankTitleWithPositionsSought++;
      if (!k.jobRoles.length && !sought) c.blankTitleNothingAnywhere++;
    } else if (liveNonBlank.length) {
      if (liveNonBlank.some((r) => norm(r) === norm(title))) c.titleMatchesLiveRole++;
      else {
        c.titleDiffersFromLiveRole++;
        const key = `"${title}" vs live "${liveNonBlank.join(" / ")}"`;
        diffs.set(key, (diffs.get(key) || 0) + 1);
      }
    }
  }

  console.log(c);
  console.log("\nTop title-vs-live-role differences:");
  [...diffs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, n]) => console.log(`  ${n}x ${k}`));
}

main().finally(() => prisma.$disconnect());
