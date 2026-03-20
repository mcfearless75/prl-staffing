import { prisma } from "@/lib/db";

export type ComplianceGap = {
  contractorId: string;
  contractorName: string;
  assignmentRole: string;
  companyName: string;
  requiredType: string;
  requirementDescription: string | null;
  isMandatory: boolean;
  status: "missing" | "expired" | "expiring" | "pending";
};

/**
 * Finds compliance gaps: requirements that are not met by contractors
 * on active/placed assignments.
 */
export async function getComplianceGaps(): Promise<ComplianceGap[]> {
  const [requirements, activeAssignments] = await Promise.all([
    prisma.complianceRequirement.findMany({
      include: { company: true },
    }),
    prisma.assignment.findMany({
      where: { status: { in: ["Placed", "Active", "Ending"] } },
      include: {
        contractor: {
          include: { compliances: true },
        },
        company: true,
      },
    }),
  ]);

  const gaps: ComplianceGap[] = [];

  for (const assignment of activeAssignments) {
    // Find requirements that apply to this assignment
    const applicableReqs = requirements.filter((req) => {
      const roleMatch =
        req.role === "All" ||
        req.role.toLowerCase() === assignment.role.toLowerCase();
      const siteMatch = !req.companyId || req.companyId === assignment.companyId;
      return roleMatch && siteMatch;
    });

    for (const req of applicableReqs) {
      // Check if contractor has a compliance record of this type
      const record = assignment.contractor.compliances.find(
        (c) => c.type === req.type
      );

      if (!record) {
        gaps.push({
          contractorId: assignment.contractor.id,
          contractorName: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
          assignmentRole: assignment.role,
          companyName: assignment.company.name,
          requiredType: req.type,
          requirementDescription: req.description,
          isMandatory: req.isMandatory,
          status: "missing",
        });
      } else if (
        record.status === "Expired" ||
        record.status === "Non-Compliant"
      ) {
        gaps.push({
          contractorId: assignment.contractor.id,
          contractorName: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
          assignmentRole: assignment.role,
          companyName: assignment.company.name,
          requiredType: req.type,
          requirementDescription: req.description,
          isMandatory: req.isMandatory,
          status: "expired",
        });
      } else if (record.status === "Expiring") {
        gaps.push({
          contractorId: assignment.contractor.id,
          contractorName: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
          assignmentRole: assignment.role,
          companyName: assignment.company.name,
          requiredType: req.type,
          requirementDescription: req.description,
          isMandatory: req.isMandatory,
          status: "expiring",
        });
      } else if (record.status === "Pending") {
        gaps.push({
          contractorId: assignment.contractor.id,
          contractorName: `${assignment.contractor.firstName} ${assignment.contractor.lastName}`,
          assignmentRole: assignment.role,
          companyName: assignment.company.name,
          requiredType: req.type,
          requirementDescription: req.description,
          isMandatory: req.isMandatory,
          status: "pending",
        });
      }
      // If "Verified" — no gap, requirement met
    }
  }

  // Sort: mandatory first, then by severity
  const severityOrder = { missing: 0, expired: 1, expiring: 2, pending: 3 };
  gaps.sort((a, b) => {
    if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1;
    return severityOrder[a.status] - severityOrder[b.status];
  });

  return gaps;
}
