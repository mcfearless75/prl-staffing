import Link from "next/link";
import type { ComplianceRecordRow } from "./types";
import { ItemActionsMenu } from "../item-actions-menu";

export function ComplianceRecordCard({ rec }: { rec: ComplianceRecordRow }) {
  return (
    <div
      key={rec.id}
      className={`rounded-lg border px-4 py-3 ${
        rec.status === "Expired" || rec.status === "Non-Compliant"
          ? "border-red-200 bg-red-50"
          : rec.status === "Expiring"
            ? "border-amber-200 bg-amber-50"
            : rec.status === "Verified"
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <span
            className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              rec.status === "Verified"
                ? "bg-emerald-100 text-emerald-700"
                : rec.status === "Pending"
                  ? "bg-amber-100 text-amber-700"
                  : rec.status === "Expiring"
                    ? "bg-orange-100 text-orange-700"
                    : rec.status === "Expired" || rec.status === "Non-Compliant"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600"
            }`}
          >
            {rec.status}
          </span>
          {rec.documentName && (
            <span className="text-sm text-gray-800 font-medium truncate">{rec.documentName}</span>
          )}
          {rec.reference && <span className="text-xs text-gray-500">#{rec.reference}</span>}
          {rec.issueDate && (
            <span className="text-xs text-gray-500">
              Issued{" "}
              {new Date(rec.issueDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {rec.indefiniteExpiry ? (
            <span className="text-xs text-gray-500">No expiry</span>
          ) : (
            rec.expiryDate && (
              <span className="text-xs text-gray-500">
                Expires{" "}
                {new Date(rec.expiryDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/compliance/${rec.id}/edit`}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            Edit
          </Link>
          <ItemActionsMenu
            contractorId={rec.contractorId}
            target={{ kind: "record", id: rec.id }}
            label={`${rec.type} record`}
          />
        </div>
      </div>
    </div>
  );
}

export function GroupedComplianceRecords({ records }: { records: ComplianceRecordRow[] }) {
  const grouped: Record<string, ComplianceRecordRow[]> = {};
  for (const rec of records) {
    if (!grouped[rec.type]) grouped[rec.type] = [];
    grouped[rec.type].push(rec);
  }
  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([type, records]) => (
        <div key={type}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{type}</h4>
          <div className="space-y-2">
            {records.map((rec) => (
              <ComplianceRecordCard key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComplianceRecordsSummary({
  contractorId,
  total,
  verified,
  pending,
  actionRequired,
}: {
  contractorId: string;
  total: number;
  verified: number;
  pending: number;
  actionRequired: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Compliance Records</h2>
        {total > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium">
              {total} compliance record{total !== 1 ? "s" : ""}
            </span>
            {" — "}
            <span className="text-emerald-700">{verified} verified</span>
            {", "}
            <span className="text-amber-600">{pending} pending</span>
            {", "}
            <span className="text-red-600">{actionRequired} action required</span>
          </p>
        )}
      </div>
      <Link
        href={`/compliance/new?contractorId=${contractorId}`}
        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
      >
        + Add Compliance Record
      </Link>
    </div>
  );
}
