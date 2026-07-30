import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { resolveRole, requirementAppliesToRole, type ResolvedRole } from "@/lib/role-normalisation";

export type ComplianceGap = {
  contractorId: string;
  contractorName: string;
  /** Canonical role the requirement matched on ("Unknown" when none resolved). */
  assignmentRole: string;
  /** Exactly what was typed on the assignment, kept for staff cross-checking. */
  rawRole: string;
  /** Whether the role came from the assignment, the job title, or nowhere. */
  roleSource: ResolvedRole["source"];
  companyName: string;
  requiredType: string;
  requirementDescription: string | null;
  isMandatory: boolean;
  status: "missing" | "expired" | "expiring" | "pending";
};

export type ComplianceGapSummary = {
  gaps: ComplianceGap[];
  /** Assigned contractors whose role could not be determined from any source. */
  contractorsWithUnknownRole: number;
  /** Assigned contractors a per-role rule can reach. */
  contractorsWithKnownRole: number;
  /** Canonical roles present in the workforce that have no requirement configured. */
  rolesWithoutRequirements: { role: string; contractors: number }[];
};

const ACTIVE_STATUSES = [...LIVE_ASSIGNMENT_STATUSES];

/**
 * Finds compliance gaps: requirements not met by contractors on active/placed
 * assignments.
 *
 * Role matching goes through the canonical resolver rather than an exact string
 * compare, because the raw assignment role text has ~58 spellings for ~49 real
 * roles and is blank altogether for well over half the assigned workforce. An
 * exact compare meant a rule for "Joiner" silently missed "Joiner Nights" and
 * reached nobody whose role field was empty.
 */
export async function getComplianceGaps(): Promise<ComplianceGap[]> {
  return (await getComplianceGapSummary()).gaps;
}

/**
 * As getComplianceGaps, but also reports how much of the workforce the
 * configured requirements can actually see. Without this it is impossible to
 * tell "no gaps" (good) from "no rules matched anyone" (bad) — they produce an
 * identical empty list.
 */
export async function getComplianceGapSummary(): Promise<ComplianceGapSummary> {
  const [requirements, activeAssignments] = await Promise.all([
    prisma.complianceRequirement.findMany({
      include: { company: true },
    }),
    prisma.assignment.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: {
        contractor: {
          include: { compliances: true },
        },
        company: true,
      },
    }),
  ]);

  const gaps: ComplianceGap[] = [];
  const roleByContractor = new Map<string, ResolvedRole>();
  // A contractor on two assignments must not be counted twice, and must not be
  // reported against the same requirement twice.
  const seenGapKeys = new Set<string>();

  for (const assignment of activeAssignments) {
    const resolved = resolveRole(assignment.role, assignment.contractor.jobTitle);

    // Keep the best role we've seen for this contractor across assignments.
    const previous = roleByContractor.get(assignment.contractor.id);
    if (!previous?.canonical) roleByContractor.set(assignment.contractor.id, resolved);

    const applicableReqs = requirements.filter((req) => {
      const roleMatch = requirementAppliesToRole(req.role, resolved);
      const siteMatch = !req.companyId || req.companyId === assignment.companyId;
      return roleMatch && siteMatch;
    });

    for (const req of applicableReqs) {
      const key = `${assignment.contractor.id}::${req.id}`;
      if (seenGapKeys.has(key)) continue;

      const record = assignment.contractor.compliances.find((c) => c.type === req.type);

      let status: ComplianceGap["status"] | null = null;
      if (!record) status = "missing";
      else if (record.status === "Expired" || record.status === "Non-Compliant") status = "expired";
      else if (record.status === "Expiring") status = "expiring";
      else if (record.status === "Pending") status = "pending";
      // "Verified" — requirement met, no gap.

      if (!status) continue;

      seenGapKeys.add(key);
      gaps.push({
        contractorId: assignment.contractor.id,
        contractorName: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
        assignmentRole: resolved.canonical ?? "Unknown",
        rawRole: resolved.raw || assignment.role || "",
        roleSource: resolved.source,
        companyName: assignment.company.name,
        requiredType: req.type,
        requirementDescription: req.description,
        isMandatory: req.isMandatory,
        status,
      });
    }
  }

  // Which roles in the live workforce have nothing configured for them.
  const contractorsByRole = new Map<string, number>();
  let unknownRole = 0;
  for (const resolved of roleByContractor.values()) {
    if (!resolved.canonical) {
      unknownRole++;
      continue;
    }
    contractorsByRole.set(resolved.canonical, (contractorsByRole.get(resolved.canonical) ?? 0) + 1);
  }

  const configuredRoles = new Set(
    requirements.filter((r) => r.role !== "All").map((r) => r.role.toLowerCase())
  );
  const rolesWithoutRequirements = [...contractorsByRole.entries()]
    .filter(([role]) => !configuredRoles.has(role.toLowerCase()))
    .map(([role, contractors]) => ({ role, contractors }))
    .sort((a, b) => b.contractors - a.contractors);

  const severityOrder = { missing: 0, expired: 1, expiring: 2, pending: 3 };
  gaps.sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1;
    return severityOrder[a.status] - severityOrder[b.status];
  });

  return {
    gaps,
    contractorsWithUnknownRole: unknownRole,
    contractorsWithKnownRole: roleByContractor.size - unknownRole,
    rolesWithoutRequirements,
  };
}

export type RequiredType = {
  type: string;
  isMandatory: boolean;
  description: string | null;
};

export type RequirementMatcher = {
  /** False when nobody has configured any requirements yet. */
  configured: boolean;
  /** Every distinct type referenced by any requirement, for report columns. */
  allTypes: string[];
  /** The checklist for one contractor, given their role and optionally a client. */
  forRole: (
    role: string | null | undefined,
    jobTitle?: string | null,
    companyId?: string | null
  ) => RequiredType[];
};

/**
 * Loads every requirement once and returns a matcher.
 *
 * This is the single source of truth for "what documents does this person
 * need". Four screens previously each hardcoded their own answer — the staff
 * upload page said Right to Work + CSCS + Insurance, the gap report said CV +
 * CSCS + CCNSG + Passport, and the contractor portal said something else again.
 * They contradicted each other and none of them consulted the requirements
 * table that the Gap Report was already using.
 *
 * Callers MUST handle `configured === false` rather than treating an empty
 * checklist as "fully compliant" — nothing being required of anyone is a
 * configuration gap, not a pass.
 */
export async function loadRequirementMatcher(): Promise<RequirementMatcher> {
  const requirements = await prisma.complianceRequirement.findMany();

  return {
    configured: requirements.length > 0,
    allTypes: [...new Set(requirements.map((r) => r.type))].sort((a, b) => a.localeCompare(b)),
    forRole(role, jobTitle, companyId) {
      const resolved = resolveRole(role, jobTitle);
      const seen = new Set<string>();
      const out: RequiredType[] = [];

      for (const req of requirements) {
        if (!requirementAppliesToRole(req.role, resolved)) continue;
        // A client-specific rule only applies when we know which client, and it
        // is that client. Global rules (companyId null) always apply.
        if (req.companyId && req.companyId !== companyId) continue;
        if (seen.has(req.type)) continue;
        seen.add(req.type);
        out.push({ type: req.type, isMandatory: req.isMandatory, description: req.description });
      }

      out.sort((a, b) => {
        if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1;
        return a.type.localeCompare(b.type);
      });
      return out;
    },
  };
}

/**
 * Convenience wrapper for a single contractor. Prefer loadRequirementMatcher
 * when checking more than one person — this hits the database each call.
 */
export async function getRequiredTypesForRole(
  role: string | null | undefined,
  jobTitle?: string | null,
  companyId?: string | null
): Promise<RequiredType[]> {
  const matcher = await loadRequirementMatcher();
  return matcher.forRole(role, jobTitle, companyId);
}
