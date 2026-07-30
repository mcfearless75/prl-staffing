export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { ComplianceUploader } from "./compliance-uploader";
import { loadRequirementMatcher } from "@/lib/compliance-gaps";
import { categoryForType } from "@/lib/compliance-types";

const ACTIVE_ASSIGNMENT_STATUSES = ["Placed", "Active", "Ending"];

/**
 * Shown only when no requirements are configured at all. Without a fallback the
 * portal would tell a contractor holding nothing that they need nothing.
 */
const FALLBACK_TYPES = ["Right to Work", "CSCS"];

/** One emoji per document family, so the list stays scannable on a phone. */
const CATEGORY_ICONS: Record<string, string> = {
  "Right to Work": "✅",
  CSCS: "🏗️",
  CCNSG: "🦺",
  NPORS: "🚜",
  CPCS: "🏗️",
  "Plant & Lifting": "🏗️",
  Medical: "🩺",
  "Health & Safety": "⛑️",
  Rail: "🚆",
  "Utilities & Streetworks": "🚧",
  "Trade Qualifications": "🎓",
  Driving: "🚗",
  "Identity & Payroll": "💷",
  DBS: "🔍",
  "Insurance & Legal": "🛡️",
  General: "📄",
};

export default async function PortalCompliancePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const [records, documents, contractor, matcher] = await Promise.all([
    prisma.complianceRecord.findMany({
      where: { contractorId },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
    }),
    prisma.document.findMany({
      where: { contractorId },
      orderBy: { version: "desc" },
    }),
    prisma.contractor.findUnique({
      where: { id: contractorId },
      select: {
        jobTitle: true,
        assignments: {
          where: { status: { in: ACTIVE_ASSIGNMENT_STATUSES } },
          select: { role: true, companyId: true },
        },
      },
    }),
    loadRequirementMatcher(),
  ]);

  // The checklist is the one configured for this contractor's role, so the
  // portal now asks for the same documents the Gap Report chases them for.
  const assignment =
    contractor?.assignments.find((a) => a.role?.trim()) ?? contractor?.assignments[0];
  const checklist = matcher.forRole(assignment?.role, contractor?.jobTitle, assignment?.companyId);

  const requiredTypes = (
    checklist.length > 0
      ? checklist.map((c) => ({ type: c.type, description: c.description, isMandatory: c.isMandatory }))
      : FALLBACK_TYPES.map((type) => ({ type, description: null, isMandatory: true }))
  ).map((c) => ({
    ...c,
    label: c.type,
    icon: CATEGORY_ICONS[categoryForType(c.type)] ?? "📄",
    description: c.description ?? `${categoryForType(c.type)} document`,
  }));

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

  // Count verified among the REQUIRED types only. Counting every verified
  // record the contractor holds meant unrelated extras could push the bar to
  // 100% while a required document was still missing.
  const total = requiredTypes.length;
  const verified = requiredTypes.filter((t) => recordByType[t.type]?.status === "Verified").length;
  const score = total > 0 ? Math.round((verified / total) * 100) : 0;

  const completedCount = requiredTypes.filter((t) => recordByType[t.type]).length;

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
              style={{ width: `${total > 0 ? Math.round((completedCount / total) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Required compliance items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Required Documents</h2>

        {requiredTypes.map((reqType) => {
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
                      {reqType.isMandatory ? "Required" : "Optional"}
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
      {records.filter((r) => !requiredTypes.find((t) => t.type === r.type)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Other Records</h2>
          {records
            .filter((r) => !requiredTypes.find((t) => t.type === r.type))
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
