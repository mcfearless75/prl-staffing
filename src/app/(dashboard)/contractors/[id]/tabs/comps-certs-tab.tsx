import Link from "next/link";
import { categoryForType } from "@/lib/compliance-types";
import { BulkDocUploader } from "../bulk-doc-uploader";
import { ItemActionsMenu } from "../item-actions-menu";
import type { ContractorWithRelations, ComplianceRecordRow, DocumentRow } from "./types";
import { ComplianceRecordsSummary, GroupedComplianceRecords } from "./compliance-record-card";

export function CompsCertsTab({
  contractorId,
  compliances,
  documents,
  complianceRecords,
  crVerified,
  crPending,
  crActionRequired,
}: {
  contractorId: string;
  compliances: ContractorWithRelations["compliances"];
  documents: DocumentRow[];
  complianceRecords: ComplianceRecordRow[];
  crVerified: number;
  crPending: number;
  crActionRequired: number;
}) {
  const compsCertsRecords = complianceRecords.filter((r) => categoryForType(r.type) !== "Right to Work");

  const recordTypes = compliances.map((c) => c.type);
  const orphanDocs = documents.filter(
    (d) =>
      !recordTypes.includes(d.type) &&
      !(recordTypes.includes("Right to Work") && ["Passport", "Share Code"].includes(d.type))
  );

  return (
    <div className="space-y-6">
      {/* Compliance */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Compliance</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/contractors/${contractorId}/edit`}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              Upload Docs →
            </Link>
            <Link
              href={`/compliance/new?contractorId=${contractorId}`}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Record
            </Link>
          </div>
        </div>
        <details className="mb-4 group">
          <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-800 select-none">
            📥 Bulk upload documents
          </summary>
          <div className="mt-3">
            <BulkDocUploader contractorId={contractorId} />
          </div>
        </details>
        {compliances.length === 0 && documents.length === 0 ? (
          <p className="text-sm text-gray-500">No compliance records or documents found.</p>
        ) : (
          <div className="space-y-3">
            {compliances.map((compliance) => {
              const compDocs = documents.filter(
                (d) =>
                  d.type === compliance.type ||
                  (compliance.type === "Right to Work" && ["Right to Work", "Passport", "Share Code"].includes(d.type))
              );
              return (
                <div
                  key={compliance.id}
                  className={`rounded-lg border px-4 py-3 ${
                    compliance.status === "Expired" || compliance.status === "Non-Compliant"
                      ? "border-red-200 bg-red-50"
                      : compliance.status === "Expiring"
                        ? "border-amber-200 bg-amber-50"
                        : compliance.status === "Verified"
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          compliance.status === "Verified"
                            ? "bg-emerald-100 text-emerald-700"
                            : compliance.status === "Pending"
                              ? "bg-amber-100 text-amber-700"
                              : compliance.status === "Expiring"
                                ? "bg-orange-100 text-orange-700"
                                : compliance.status === "Expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {compliance.status || "-"}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{compliance.type}</span>
                      {compliance.reference && (
                        <span className="text-xs text-gray-500">#{compliance.reference}</span>
                      )}
                      {compliance.indefiniteExpiry ? (
                        <span className="text-xs text-gray-500">No expiry</span>
                      ) : (
                        compliance.expiryDate && (
                          <span className="text-xs text-gray-500">
                            Expires{" "}
                            {new Date(compliance.expiryDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {compliance.status !== "Verified" && (
                        <a
                          href={`/api/compliance/${compliance.id}/verify?redirect=/contractors/${contractorId}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                        >
                          ✓ Approve
                        </a>
                      )}
                      <Link href={`/compliance/${compliance.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                        View
                      </Link>
                      <Link href={`/compliance/${compliance.id}/edit`} className="text-xs font-medium text-gray-500 hover:text-gray-800">
                        Edit
                      </Link>
                      <ItemActionsMenu
                        contractorId={contractorId}
                        target={{ kind: "record", id: compliance.id }}
                        label={`${compliance.type} record`}
                      />
                    </div>
                  </div>
                  {/* Uploaded documents for this compliance type */}
                  {compDocs.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2">
                      {compDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between text-xs text-gray-600">
                          <span className="truncate max-w-[60%]">📎 {doc.fileName}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`/api/documents/download?id=${doc.id}&view=true`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                            <a href={`/api/documents/download?id=${doc.id}`} className="text-gray-500 hover:underline">
                              Download
                            </a>
                            <ItemActionsMenu
                              contractorId={contractorId}
                              target={{ kind: "document", id: doc.id }}
                              label={`${doc.type} file "${doc.fileName}"`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Documents with no matching compliance record */}
            {orphanDocs.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3">
                <p className="text-xs font-semibold text-blue-800 mb-2">📁 Uploaded documents (no linked record)</p>
                <div className="space-y-1">
                  {orphanDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-xs text-gray-600">
                      <span className="truncate max-w-[60%]">
                        {doc.type} — {doc.fileName}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={`/api/documents/download?id=${doc.id}&view=true`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </a>
                        <a href={`/api/documents/download?id=${doc.id}`} className="text-gray-500 hover:underline">
                          Download
                        </a>
                        <ItemActionsMenu
                          contractorId={contractorId}
                          target={{ kind: "document", id: doc.id }}
                          label={`${doc.type} file "${doc.fileName}"`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compliance Records — Comps & Certs */}
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
        ) : compsCertsRecords.length === 0 ? (
          <p className="text-sm text-gray-500">No Comps & Certs records on file.</p>
        ) : (
          <section>
            <h3 className="mb-3 border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-900">
              Comps & Certs
              <span className="ml-2 font-normal text-gray-400">({compsCertsRecords.length})</span>
            </h3>
            <GroupedComplianceRecords records={compsCertsRecords} />
          </section>
        )}
      </div>
    </div>
  );
}
