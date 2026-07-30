/**
 * Answers the question that decides whether per-role compliance requirements can
 * work at all: for the assigned workforce, do we actually KNOW each contractor's
 * role, and if the assignment role is blank can we recover it from
 * Contractor.jobTitle or the ContractorJobRole links?
 *
 *     railway run --service Postgres node scripts/audit-role-coverage.mjs
 *
 * PII-free: counts and role strings only.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres node scripts/audit-role-coverage.mjs");
  process.exit(1);
}

const prisma = new PrismaClient();
const ACTIVE = ["Placed", "Active", "Ending"];

const blank = (s) => !s || !s.trim();

async function main() {
  const assignments = await prisma.assignment.findMany({
    where: { status: { in: ACTIVE } },
    select: {
      role: true,
      contractorId: true,
      contractor: {
        select: {
          jobTitle: true,
          jobRoles: { select: { jobRole: { select: { name: true } } } },
          _count: { select: { compliances: true } },
        },
      },
    },
  });

  // Collapse to one row per contractor: best role we can find, from any source.
  const byContractor = new Map();
  for (const a of assignments) {
    const cur = byContractor.get(a.contractorId) ?? {
      assignmentRoles: new Set(),
      jobTitle: a.contractor.jobTitle,
      jobRoleLinks: a.contractor.jobRoles.map((r) => r.jobRole.name),
      records: a.contractor._count.compliances,
    };
    if (!blank(a.role)) cur.assignmentRoles.add(a.role.trim());
    byContractor.set(a.contractorId, cur);
  }

  const total = byContractor.size;
  let hasAssignmentRole = 0;
  let blankButJobTitle = 0;
  let blankButJobRoleLink = 0;
  let noRoleAnywhere = 0;
  let noRoleAndNoRecords = 0;

  const recoveredTitles = new Map();

  for (const c of byContractor.values()) {
    if (c.assignmentRoles.size > 0) {
      hasAssignmentRole++;
      continue;
    }
    if (!blank(c.jobTitle)) {
      blankButJobTitle++;
      const k = c.jobTitle.trim();
      recoveredTitles.set(k, (recoveredTitles.get(k) ?? 0) + 1);
      continue;
    }
    if (c.jobRoleLinks.length > 0) {
      blankButJobRoleLink++;
      continue;
    }
    noRoleAnywhere++;
    if (c.records === 0) noRoleAndNoRecords++;
  }

  console.log(`\n=== ROLE COVERAGE, ASSIGNED WORKFORCE ===`);
  console.log(`assigned contractors (distinct):        ${total}`);
  console.log(`  role on assignment:                   ${hasAssignmentRole}`);
  console.log(`  blank assignment role:                ${total - hasAssignmentRole}`);
  console.log(`    ...recoverable from jobTitle:       ${blankButJobTitle}`);
  console.log(`    ...recoverable from JobRole link:   ${blankButJobRoleLink}`);
  console.log(`    ...NO role known anywhere:          ${noRoleAnywhere}`);
  console.log(`       of which zero compliance records: ${noRoleAndNoRecords}`);

  const reachable = hasAssignmentRole + blankButJobTitle + blankButJobRoleLink;
  console.log(`\nper-role rules could reach: ${reachable}/${total} (${Math.round((reachable / total) * 100)}%)`);
  console.log(`today (assignment role only): ${hasAssignmentRole}/${total} (${Math.round((hasAssignmentRole / total) * 100)}%)`);

  if (recoveredTitles.size) {
    console.log(`\n=== jobTitle values that would fill a blank assignment role ===`);
    for (const [t, n] of [...recoveredTitles.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`${String(n).padStart(4)}  ${JSON.stringify(t)}`);
    }
  }

  // Cross-tab: does having a role correlate with having records?
  let roleAndRecords = 0;
  let roleNoRecords = 0;
  for (const c of byContractor.values()) {
    const known = c.assignmentRoles.size > 0 || !blank(c.jobTitle) || c.jobRoleLinks.length > 0;
    if (!known) continue;
    if (c.records > 0) roleAndRecords++;
    else roleNoRecords++;
  }
  console.log(`\n=== of the ${reachable} with a known role ===`);
  console.log(`  hold >=1 compliance record: ${roleAndRecords}`);
  console.log(`  hold zero records:          ${roleNoRecords}\n`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
