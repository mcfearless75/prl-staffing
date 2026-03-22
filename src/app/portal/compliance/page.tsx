export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { ComplianceUploader } from "./compliance-uploader";

const REQUIRED_TYPES = [
  { type: "CSCS", label: "CSCS Card", description: "Construction Skills Certification Scheme card", icon: "🏗️" },
  { type: "Right to Work", label: "Right to Work", description: "Passport, visa, or share code proving eligibility to work in UK", icon: "✅" },
  { type: "DBS", label: "DBS Check", description: "Disclosure and Barring Service certificate", icon: "🔍" },
  { type: "Insurance", label: "Insurance", description: "Public liability or professional indemnity insurance", icon: "🛡️" },
  { type: "Qualification", label: "Qualification / Cert", description: "Trade qualifications, NVQs, or professional certificates", icon: "🎓" },
  { type: "IR35 Assessment", label: "IR35 Assessment", description: "Status Determination Statement for off-payroll working", icon: "📝" },
];

export default async function PortalCompliancePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const records = await prisma.complianceRecord.findMany({
    where: { contractorId },
    orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
  });

  const documents = await prisma.document.findMany({
    where: { contractorId },
    orderBy: { version: "desc" },
  });

  // Map records by type
  const recordByType: Record<string, typeof records[0]> = {};
  for (const r of records) {
    if (!recordByType[r.type]) recordByType[r.type] = r;
  }

  // Map latest document by type
  const docByType: Record<string, typeof documents[0]> = {};
  for (const d of documents) {
    if (!docByType[d.type]) docByType[d.type] = d;
  }

  const verified = records.filter((r) => r.status === "Verified").length;
  const total = REQUIRED_TYPES.length;
  const score = Math.round((verified / total) * 100);

  const completedCount = REQUIRED_TYPES.filter((t) => recordByType[t.type]).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Compliance</h1>

      {/* Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-center">
          <p className={`text-4xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {score}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {verified} of {total} records verified
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>{completedCount} of {total} submitted</span>
            <span>{total - completedCount} remaining</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.round((completedCount / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Required compliance items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Required Documents</h2>

        {REQUIRED_TYPES.map((reqType) => {
          const record = recordByType[reqType.type];
          const doc = docByType[reqType.type];
          const status = record?.status || "Not Submitted";
          const isComplete = record && (record.status === "Verified" || record.status === "Pending");

          return (
            <div
              key={reqType.type}
              className={`rounded-xl border bg-white overflow-hidden ${
                record?.status === "Verified"
                  ? "border-emerald-200"
                  : record?.status === "Pending"
                  ? "border-blue-200"
                  : record?.status === "Expired" || record?.status === "Non-Compliant"
                  ? "border-red-200"
                  : record?.status === "Expiring"
                  ? "border-amber-200"
                  : "border-gray-200"
              }`}
            >
              {/* Header */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{reqType.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{reqType.label}</p>
                      <p className="text-[10px] text-gray-400">{reqType.description}</p>
                    </div>
                  </div>
                  {record ? (
                    <Badge variant={record.status}>{record.status}</Badge>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Required
                    </span>
                  )}
                </div>

                {/* Record details */}
                {record && (
                  <div className="mt-2 ml-9 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                    {record.reference && <span>Ref: {record.reference}</span>}
                    {record.issueDate && <span>Issued: {formatDate(record.issueDate)}</span>}
                    {record.expiryDate && (
                      <span className={record.status === "Expired" ? "text-red-600 font-medium" : ""}>
                        Expires: {formatDate(record.expiryDate)}
                      </span>
                    )}
                    {doc && <span>File: {doc.fileName} (v{doc.version})</span>}
                  </div>
                )}
              </div>

              {/* Upload section - show for items not verified */}
              {(!record || record.status === "Expired" || record.status === "Non-Compliant" || record.status === "Expiring") && (
                <div className={`border-t px-4 py-3 ${
                  !record ? "bg-gray-50 border-gray-100" :
                  record.status === "Expired" ? "bg-red-50 border-red-100" :
                  "bg-amber-50 border-amber-100"
                }`}>
                  <ComplianceUploader
                    contractorId={contractorId}
                    docType={reqType.type}
                    label={reqType.label}
                    isResubmit={!!record}
                  />
                </div>
              )}

              {/* Verified checkmark */}
              {record?.status === "Verified" && (
                <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-2">
                  <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                    ✓ Verified by PRL Site Solutions
                  </p>
                </div>
              )}

              {/* Pending notice */}
              {record?.status === "Pending" && (
                <div className="border-t border-blue-100 bg-blue-50 px-4 py-2">
                  <p className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                    ⏳ Submitted — awaiting verification by PRL staff
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional records not in required list */}
      {records.filter((r) => !REQUIRED_TYPES.find((t) => t.type === r.type)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Other Records</h2>
          {records
            .filter((r) => !REQUIRED_TYPES.find((t) => t.type === r.type))
            .map((record) => (
              <div key={record.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{record.type}</p>
                  <Badge variant={record.status}>{record.status}</Badge>
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center pb-4">
        Upload your documents and PRL Site Solutions staff will verify them.
        Keep your compliance up to date to maintain your active status.
      </p>
    </div>
  );
}
