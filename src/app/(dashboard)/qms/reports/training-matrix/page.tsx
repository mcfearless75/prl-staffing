export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TrainingMatrixClient } from "./client";

const COMPLIANCE_TYPES = [
  "CSCS",
  "DBS",
  "Right to Work",
  "Insurance",
  "IR35 Assessment",
  "Qualification",
  "Passport",
] as const;

export default async function TrainingMatrixPage() {
  const contractors = await prisma.contractor.findMany({
    where: { status: "Active" },
    include: {
      compliances: true,
    },
    orderBy: { lastName: "asc" },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Build matrix data
  const matrixData = contractors.map((c) => {
    const complianceMap = new Map(
      c.compliances.map((cr) => [cr.type, cr])
    );

    const cells = COMPLIANCE_TYPES.map((type) => {
      const record = complianceMap.get(type);
      if (!record) {
        return { type, status: "missing" as const, expiryDate: null };
      }

      if (record.status === "Verified") {
        // Check if expiring soon
        if (record.expiryDate && new Date(record.expiryDate) <= thirtyDaysFromNow && new Date(record.expiryDate) > now) {
          return {
            type,
            status: "expiring" as const,
            expiryDate: record.expiryDate.toISOString(),
          };
        }
        // Check if expired
        if (record.expiryDate && new Date(record.expiryDate) <= now) {
          return {
            type,
            status: "expired" as const,
            expiryDate: record.expiryDate.toISOString(),
          };
        }
        return {
          type,
          status: "verified" as const,
          expiryDate: record.expiryDate?.toISOString() || null,
        };
      }

      if (record.status === "Expired") {
        return {
          type,
          status: "expired" as const,
          expiryDate: record.expiryDate?.toISOString() || null,
        };
      }

      if (record.status === "Expiring") {
        return {
          type,
          status: "expiring" as const,
          expiryDate: record.expiryDate?.toISOString() || null,
        };
      }

      // Pending or other
      return {
        type,
        status: "pending" as const,
        expiryDate: record.expiryDate?.toISOString() || null,
      };
    });

    const verifiedCount = cells.filter((c) => c.status === "verified").length;
    const isCompliant = verifiedCount === COMPLIANCE_TYPES.length;
    const hasExpiring = cells.some((c) => c.status === "expiring");
    const hasExpired = cells.some((c) => c.status === "expired");
    const hasMissing = cells.some((c) => c.status === "missing");

    let overallStatus: "compliant" | "expiring" | "non-compliant" = "compliant";
    if (hasExpired || hasMissing || cells.some((c) => c.status === "pending")) {
      overallStatus = "non-compliant";
    } else if (hasExpiring) {
      overallStatus = "expiring";
    }

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      cells,
      isCompliant,
      overallStatus,
    };
  });

  // Summary stats
  const totalContractors = matrixData.length;
  const compliantCount = matrixData.filter((c) => c.overallStatus === "compliant").length;
  const expiringCount = matrixData.filter((c) => c.overallStatus === "expiring").length;
  const nonCompliantCount = matrixData.filter((c) => c.overallStatus === "non-compliant").length;
  const compliantPct = totalContractors > 0 ? Math.round((compliantCount / totalContractors) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Matrix"
        description="Compliance status for all active contractors"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/qms/reports"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Link>
            <a
              href="/api/qms-reports/training-matrix"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Export to Excel
            </a>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{compliantPct}%</p>
          <p className="text-xs text-gray-500">Compliant</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-2xl font-bold text-emerald-700">{compliantCount}</p>
          <p className="text-xs text-emerald-600">Fully Compliant</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-center">
          <p className="text-2xl font-bold text-yellow-700">{expiringCount}</p>
          <p className="text-xs text-yellow-600">Expiring Soon</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <p className="text-2xl font-bold text-red-700">{nonCompliantCount}</p>
          <p className="text-xs text-red-600">Non-Compliant</p>
        </div>
      </div>

      <TrainingMatrixClient
        matrixData={matrixData}
        complianceTypes={[...COMPLIANCE_TYPES]}
      />
    </div>
  );
}
