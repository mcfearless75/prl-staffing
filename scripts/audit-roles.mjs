/**
 * Read-only audit of the role vocabulary, ahead of building per-role compliance
 * requirements. Requirement matching is on the EXACT lowercased assignment role
 * name, so every spelling variant is a separate rule that must be configured —
 * or a silent miss. This lists what actually exists.
 *
 *     railway run --service Postgres node scripts/audit-roles.mjs
 *
 * PII-free: role names and counts only, no contractor identifiers.
 */

import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Run via: railway run --service Postgres node scripts/audit-roles.mjs");
  process.exit(1);
}

const prisma = new PrismaClient();

const ACTIVE = ["Placed", "Active", "Ending"];

async function main() {
  const [assignments, jobRoles, requirements, contractorRoleLinks] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: { in: ACTIVE } },
      select: { role: true, contractorId: true },
    }),
    prisma.jobRole.findMany({ select: { name: true, active: true } }),
    prisma.complianceRequirement.count(),
    prisma.contractorJobRole.count(),
  ]);

  // Distinct assignment roles, with how many distinct contractors sit behind each.
  const byRole = new Map();
  for (const a of assignments) {
    if (!byRole.has(a.role)) byRole.set(a.role, new Set());
    byRole.get(a.role).add(a.contractorId);
  }

  const rows = [...byRole.entries()]
    .map(([role, set]) => ({ role, contractors: set.size }))
    .sort((a, b) => b.contractors - a.contractors || a.role.localeCompare(b.role));

  console.log(`\n=== ASSIGNMENT ROLES (status in ${ACTIVE.join("/")}) ===`);
  console.log(`${rows.length} distinct role strings across ${assignments.length} assignments\n`);
  for (const r of rows) {
    const raw = JSON.stringify(r.role); // exposes trailing/double spaces
    console.log(`${String(r.contractors).padStart(4)}  ${raw}`);
  }

  // Whitespace / casing hygiene — these are invisible in a UI but break matching.
  const dirty = rows.filter(
    (r) => r.role !== r.role.trim() || /\s{2,}/.test(r.role) || r.role !== r.role.replace(/\s+/g, " ")
  );
  console.log(`\n=== WHITESPACE ISSUES: ${dirty.length} ===`);
  for (const r of dirty) console.log(`  ${JSON.stringify(r.role)}`);

  // Case-insensitive collisions: same role, different casing = two rules needed.
  const byLower = new Map();
  for (const r of rows) {
    const k = r.role.toLowerCase().replace(/\s+/g, " ").trim();
    if (!byLower.has(k)) byLower.set(k, []);
    byLower.get(k).push(r.role);
  }
  const collisions = [...byLower.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n=== CASE/SPACING COLLISIONS: ${collisions.length} ===`);
  for (const [k, v] of collisions) console.log(`  ${k} <- ${v.map((x) => JSON.stringify(x)).join(", ")}`);

  console.log(`\n=== JobRole TABLE ===`);
  console.log(`${jobRoles.length} rows (${jobRoles.filter((j) => j.active).length} active), ${contractorRoleLinks} contractor links`);
  for (const j of jobRoles.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${j.active ? " " : "x"} ${JSON.stringify(j.name)}`);
  }

  // Do assignment roles line up with the JobRole vocabulary at all?
  const jobRoleLower = new Set(jobRoles.map((j) => j.name.toLowerCase().trim()));
  const unmatched = rows.filter((r) => !jobRoleLower.has(r.role.toLowerCase().replace(/\s+/g, " ").trim()));
  console.log(`\n=== ASSIGNMENT ROLES WITH NO JobRole MATCH: ${unmatched.length} of ${rows.length} ===`);
  for (const r of unmatched) console.log(`  ${String(r.contractors).padStart(4)}  ${JSON.stringify(r.role)}`);

  console.log(`\n=== ComplianceRequirement rows: ${requirements} ===\n`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
