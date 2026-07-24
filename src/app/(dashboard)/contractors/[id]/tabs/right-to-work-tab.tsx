import Link from "next/link";
import { categoryForType } from "@/lib/compliance-types";
import type { ComplianceRecordRow } from "./types";
import { ComplianceRecordsSummary, GroupedComplianceRecords } from "./compliance-record-card";

export function RightToWorkTab({
  contractorId,
  complianceRecords,
  crVerified,
  crPending,
  crActionRequired,
}: {
  contractorId: string;
  complianceRecords: ComplianceRecordRow[];
  crVerified: number;
  crPending: number;
  crActionRequired: number;
}) {
  const rtwRecords = complianceRecords.filter((r) => categoryForType(r.type) === "Right to Work");

  return (
    <div className="rounded-xl border bg-white p-6">
      <ComplianceRecordsSummary
        contractorId={contractorId}
        total={complianceRecords.length}
        verified={crVerified}
        pending={crPending}
        actionRequired={crActionRequired}
      />

      {complianceRecords.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No compliance records on file.</p>
          <Link
            href={`/compliance/new?contractorId=${contractorId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Compliance Record
          </Link>
        </div>
      ) : rtwRecords.length === 0 ? (
        <p className="text-sm text-gray-500">No Right to Work records on file.</p>
      ) : (
        <section>
          <h3 className="mb-3 border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-900">
            Right to Work
            <span className="ml-2 font-normal text-gray-400">({rtwRecords.length})</span>
          </h3>
          <GroupedComplianceRecords records={rtwRecords} />
        </section>
      )}
    </div>
  );
}
