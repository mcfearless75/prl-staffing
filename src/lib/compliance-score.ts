import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { loadRequirementMatcher } from "@/lib/compliance-gaps";
import { resolveRole } from "@/lib/role-normalisation";

// The headline compliance percentage, computed in ONE place.
//
// This number has previously been recalculated independently on the dashboard,
// on /compliance, on the compliance report and on the Intelligence page, which
// is how the app ended up showing "Compliance — action needed, critical" next
// to "Compliance score: 100% — healthy" on the same screen. Anything that
// displays a compliance percentage should call this.
//
// DEFINITION (changed 2026-07-30, on Paul's decision):
//   A contractor is compliant when every MANDATORY document required for their
//   role is present AND Verified.
//
// The previous definition was "every record the contractor happens to hold is
// Verified", which checked no required set at all — someone holding a single
// verified CSCS and nothing else scored as fully compliant.
//
// Consequence worth remembering: this number now moves when requirements are
// edited, not only when documents change. Configuring MORE roles will push it
// DOWN, because more is being asked of more people. That is the metric working
// correctly, but it needs saying out loud before anyone reads a fall as a
// regression in the workforce.

export type ComplianceScore = {
  /** Distinct contractors on a live assignment — see LIVE_ASSIGNMENT_STATUSES. */
  assignedTotal: number;
  /** Every mandatory required document present and Verified. */
  fullyCompliant: number;
  /** Holds records, but a required document is missing or not yet Verified. */
  actionRequired: number;
  /** At least one required document sitting at Pending review. */
  pendingReview: number;
  /** Required document present but Expiring. */
  expiring: number;
  /** Holds no compliance records at all. */
  noRecords: number;
  /** Contractors with no mandatory requirement configured for their role. */
  noRequirements: number;
  /** Contractors with no role recorded anywhere — only "All" rules reach them. */
  unknownRole: number;
  /** fullyCompliant / assignedTotal, 0-100. */
  score: number;
  /** False when no requirements exist at all — the score cannot mean anything. */
  requirementsConfigured: boolean;
};

const ACTIVE_STATUSES = [...LIVE_ASSIGNMENT_STATUSES];

export async function getComplianceScore(): Promise<ComplianceScore> {
  const [assignments, matcher] = await Promise.all([
    prisma.assignment.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      select: {
        role: true,
        companyId: true,
        contractorId: true,
        contractor: {
          select: {
            jobTitle: true,
            compliances: { select: { type: true, status: true } },
          },
        },
      },
    }),
    loadRequirementMatcher(),
  ]);

  // Collapse to one row per contractor. A contractor on two assignments is one
  // person; prefer the assignment that actually carries a role.
  type Row = {
    records: { type: string; status: string }[];
    hasRole: boolean;
    required: string[];
    optionalCount: number;
  };
  const byContractor = new Map<string, Row>();

  for (const a of assignments) {
    const existing = byContractor.get(a.contractorId);
    if (existing?.hasRole) continue;

    const resolved = resolveRole(a.role, a.contractor.jobTitle);
    const checklist = matcher.forRole(a.role, a.contractor.jobTitle, a.companyId);

    byContractor.set(a.contractorId, {
      records: a.contractor.compliances,
      hasRole: Boolean(resolved.canonical),
      required: checklist.filter((c) => c.isMandatory).map((c) => c.type),
      optionalCount: checklist.filter((c) => !c.isMandatory).length,
    });
  }

  let fullyCompliant = 0;
  let actionRequired = 0;
  let pendingReview = 0;
  let expiring = 0;
  let noRecords = 0;
  let noRequirements = 0;
  let unknownRole = 0;

  for (const row of byContractor.values()) {
    if (!row.hasRole) unknownRole++;
    if (row.records.length === 0) noRecords++;

    if (row.required.length === 0) {
      // Nothing is required of this person, so there is nothing to pass. Counted
      // as not-compliant and reported separately rather than silently scoring as
      // a pass — an unconfigured role must not look like a clean bill of health.
      noRequirements++;
      continue;
    }

    const statusByType = new Map(row.records.map((r) => [r.type, r.status]));
    const statuses = row.required.map((t) => statusByType.get(t) ?? "Missing");

    if (statuses.every((s) => s === "Verified")) {
      fullyCompliant++;
    } else if (statuses.some((s) => s === "Missing" || s === "Expired" || s === "Non-Compliant")) {
      actionRequired++;
    } else if (statuses.some((s) => s === "Expiring")) {
      expiring++;
    } else {
      pendingReview++;
    }
  }

  const assignedTotal = byContractor.size;

  return {
    assignedTotal,
    fullyCompliant,
    actionRequired,
    pendingReview,
    expiring,
    noRecords,
    noRequirements,
    unknownRole,
    score: assignedTotal > 0 ? Math.round((fullyCompliant / assignedTotal) * 100) : 0,
    requirementsConfigured: matcher.configured,
  };
}
