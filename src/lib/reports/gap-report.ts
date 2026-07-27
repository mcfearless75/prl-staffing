import { prisma } from "@/lib/db";

// Required docs every active contractor must have
const REQUIRED_DOCS = ["CV", "CSCS", "CCNSG", "Passport"];
// Optional but tracked
const OPTIONAL_DOCS = ["NPORS", "Share Code", "DBS", "Insurance", "Right to Work"];

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
  docTypeBreakdown: { type: string; uploaded: number; verified: number; missing: number; total: number }[];
}

export async function getGapReport(): Promise<{
  summary: GapReportSummary;
  contractors: GapReportContractor[];
}> {
  const contractors = await prisma.contractor.findMany({
    where: { status: "Active" },
    include: {
      documents: { orderBy: { version: "desc" } },
      compliances: true,
    },
    orderBy: { lastName: "asc" },
  });

  const report: GapReportContractor[] = contractors.map((c) => {
    const docTypes = new Set(c.documents.map((d) => d.type));
    const complianceTypes = new Map(c.compliances.map((cr) => [cr.type, cr.status]));

    const required = REQUIRED_DOCS.map((type) => ({
      type,
      hasDocument: docTypes.has(type),
      complianceStatus: complianceTypes.get(type) || null,
      status: docTypes.has(type)
        ? complianceTypes.get(type) === "Verified" ? "verified" : "pending"
        : "missing",
    }));

    const optional = OPTIONAL_DOCS.map((type) => ({
      type,
      hasDocument: docTypes.has(type),
      complianceStatus: complianceTypes.get(type) || null,
      status: docTypes.has(type)
        ? complianceTypes.get(type) === "Verified" ? "verified" : "pending"
        : "not_uploaded",
    }));

    const requiredComplete = required.filter((r) => r.status === "verified").length;
    const requiredTotal = required.length;
    const completionPct = Math.round((requiredComplete / requiredTotal) * 100);

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      required,
      optional,
      completionPct,
      requiredComplete,
      requiredTotal,
      isFullyCompliant: requiredComplete === requiredTotal,
    };
  });

  const summary: GapReportSummary = {
    totalActive: contractors.length,
    fullyCompliant: report.filter((r) => r.isFullyCompliant).length,
    partiallyCompliant: report.filter((r) => r.completionPct > 0 && !r.isFullyCompliant).length,
    nonCompliant: report.filter((r) => r.completionPct === 0).length,
    avgCompletion: report.length > 0
      ? Math.round(report.reduce((sum, r) => sum + r.completionPct, 0) / report.length)
      : 0,
    docTypeBreakdown: REQUIRED_DOCS.map((type) => ({
      type,
      uploaded: report.filter((r) => r.required.find((d) => d.type === type)?.hasDocument).length,
      verified: report.filter((r) => r.required.find((d) => d.type === type)?.status === "verified").length,
      missing: report.filter((r) => r.required.find((d) => d.type === type)?.status === "missing").length,
      total: report.length,
    })),
  };

  return { summary, contractors: report };
}
