import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { loadRequirementMatcher } from "@/lib/compliance-gaps";
import { resolveRole } from "@/lib/role-normalisation";

export interface GapReportDoc {
  type: string;
  hasDocument: boolean;
  complianceStatus: string | null;
  status: string;
}

export interface GapReportContractor {
  id: string;
  name: string;
  email: string | null;
  /** Canonical role the checklist was derived from. */
  role: string | null;
  required: GapReportDoc[];
  optional: GapReportDoc[];
  completionPct: number;
  requiredComplete: number;
  requiredTotal: number;
  isFullyCompliant: boolean;
}

export interface GapReportSummary {
  totalActive: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  avgCompletion: number;
  docTypeBreakdown: {
    type: string;
    uploaded: number;
    verified: number;
    missing: number;
    total: number;
  }[];
  /** False when no requirements exist — the report cannot mean anything yet. */
  requirementsConfigured: boolean;
  /** Contractors with no role on record, so only "All roles" rules reach them. */
  contractorsWithoutRole: number;
  /** Contractors whose resolved role has no checklist configured. */
  contractorsWithoutChecklist: number;
}

const ACTIVE_ASSIGNMENT_STATUSES = [...LIVE_ASSIGNMENT_STATUSES];

/**
 * Per-contractor document gap report.
 *
 * The required set is now derived from ComplianceRequirement per role, rather
 * than the same four hardcoded documents for everybody. That fixed hardcoded
 * list was the thing the client was asking about: a Joiner and a Groundworker
 * were being measured against an identical checklist that matched neither.
 */
export async function getGapReport(): Promise<{
  summary: GapReportSummary;
  contractors: GapReportContractor[];
}> {
  const [contractors, matcher] = await Promise.all([
    prisma.contractor.findMany({
      where: { status: "Active" },
      include: {
        documents: { orderBy: { version: "desc" } },
        compliances: true,
        assignments: {
          where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
          select: { role: true, companyId: true },
        },
      },
      orderBy: { lastName: "asc" },
    }),
    loadRequirementMatcher(),
  ]);

  let contractorsWithoutRole = 0;
  let contractorsWithoutChecklist = 0;

  const report: GapReportContractor[] = contractors.map((c) => {
    const docTypes = new Set(c.documents.map((d) => d.type));
    const complianceTypes = new Map(c.compliances.map((cr) => [cr.type, cr.status]));

    // Use the first active assignment that yields a role; fall back to the
    // contractor's job title when no assignment carries one.
    const assignment = c.assignments.find((a) => a.role?.trim()) ?? c.assignments[0];
    const resolved = resolveRole(assignment?.role, c.jobTitle);
    if (!resolved.canonical) contractorsWithoutRole++;

    const checklist = matcher.forRole(assignment?.role, c.jobTitle, assignment?.companyId);
    if (checklist.length === 0) contractorsWithoutChecklist++;

    const toDoc = (type: string, missingLabel: string): GapReportDoc => {
      const status = complianceTypes.get(type) ?? null;
      const has = docTypes.has(type) || complianceTypes.has(type);
      return {
        type,
        hasDocument: has,
        complianceStatus: status,
        status: has ? (status === "Verified" ? "verified" : "pending") : missingLabel,
      };
    };

    const required = checklist.filter((r) => r.isMandatory).map((r) => toDoc(r.type, "missing"));
    const optional = checklist.filter((r) => !r.isMandatory).map((r) => toDoc(r.type, "not_uploaded"));

    const requiredComplete = required.filter((r) => r.status === "verified").length;
    const requiredTotal = required.length;
    // No checklist means nothing is known to be required — reported as 0% with
    // requiredTotal 0 so it reads as unconfigured rather than as a clean pass.
    const completionPct = requiredTotal > 0 ? Math.round((requiredComplete / requiredTotal) * 100) : 0;

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      role: resolved.canonical,
      required,
      optional,
      completionPct,
      requiredComplete,
      requiredTotal,
      isFullyCompliant: requiredTotal > 0 && requiredComplete === requiredTotal,
    };
  });

  // Breakdown columns are the union of every mandatory type actually required
  // of somebody, not a fixed list.
  const breakdownTypes = [
    ...new Set(report.flatMap((r) => r.required.map((d) => d.type))),
  ].sort((a, b) => a.localeCompare(b));

  const scored = report.filter((r) => r.requiredTotal > 0);

  const summary: GapReportSummary = {
    totalActive: contractors.length,
    fullyCompliant: report.filter((r) => r.isFullyCompliant).length,
    partiallyCompliant: report.filter((r) => r.completionPct > 0 && !r.isFullyCompliant).length,
    nonCompliant: report.filter((r) => r.requiredTotal > 0 && r.completionPct === 0).length,
    avgCompletion:
      scored.length > 0
        ? Math.round(scored.reduce((sum, r) => sum + r.completionPct, 0) / scored.length)
        : 0,
    docTypeBreakdown: breakdownTypes.map((type) => {
      const applicable = report.filter((r) => r.required.some((d) => d.type === type));
      return {
        type,
        uploaded: applicable.filter((r) => r.required.find((d) => d.type === type)?.hasDocument).length,
        verified: applicable.filter((r) => r.required.find((d) => d.type === type)?.status === "verified").length,
        missing: applicable.filter((r) => r.required.find((d) => d.type === type)?.status === "missing").length,
        // Denominator is who this document is required of, not the whole book.
        total: applicable.length,
      };
    }),
    requirementsConfigured: matcher.configured,
    contractorsWithoutRole,
    contractorsWithoutChecklist,
  };

  return { summary, contractors: report };
}
