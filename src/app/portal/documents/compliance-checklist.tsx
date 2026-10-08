import { prisma } from "@/lib/db";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { ComplianceUploader } from "../compliance/compliance-uploader";
import { loadChecklistTypes } from "@/lib/compliance-gaps";
import { categoryForType } from "@/lib/compliance-types";
import { bestRecordFor, recordMeetsSpec, requirementLabel, type RequirementSpec } from "@/lib/requirement-match";
import { RTW_SATISFIED_STATUSES, normaliseShareCode, parseRtwRoute, rtwProgress } from "@/lib/rtw-route";
import { documentsScore, rtwItemState, type ItemState } from "@/lib/portal-score";
import { REJECTED_STATUS, reasonFromNote } from "@/lib/document-rejection";

// Moved to compliance-gaps so the staff reminder can use the same checklist.
export { loadChecklistTypes };

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

/**
 * The worker's required-documents checklist for their role, with an upload per
 * row. Lived on the portal Compliance tab; moved into Documents (App Invite
 * Form, part C) so there is one place to send workers.
 */
export async function ComplianceChecklist({ contractorId }: { contractorId: string }) {
  const [records, documents, checklistTypes, rtw] = await Promise.all([
    prisma.complianceRecord.findMany({
      where: { contractorId },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
    }),
    prisma.document.findMany({
      where: { contractorId },
      orderBy: { version: "desc" },
    }),
    loadChecklistTypes(contractorId),
    prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { rtwRoute: true, shareCode: true },
    }),
  ]);

  // Right to Work has its own section above (passport / share code / birth
  // certificate), which saves the SPECIFIC type, e.g. "Passport — UK or
  // Ireland". A generic "Right to Work" row here never matched it, so a worker
  // who had just finished that section was told RTW was still "Required".
  // Same rule as the home-page banner's cards step.
  const requiredTypes = checklistTypes
    .filter((c) => categoryForType(c.type) !== "Right to Work")
    .map((c) => ({
    ...c,
    label: requirementLabel(c),
    icon: CATEGORY_ICONS[categoryForType(c.type)] ?? "📄",
    description: c.description ?? `${categoryForType(c.type)} document`,
  }));

  // Map latest document by type
  const docByType: Record<string, typeof documents[0]> = {};
  for (const d of documents) {
    if (!docByType[d.type]) docByType[d.type] = d;
  }

  // Category-aware: a "CSCS" requirement is met by "CSCS (Blue) — …" (requirement-match.ts).
  const recordFor = (spec: RequirementSpec) => bestRecordFor(spec, records);
  const cardState = (spec: RequirementSpec): ItemState => {
    const status = recordFor(spec)?.status;
    return status === "Verified" ? "verified" : status ? "submitted" : "missing";
  };

  // Right to Work always counts, as one item, judged by the RTW section's own
  // check — so the percentage can't say 100% while it is missing.
  const route = parseRtwRoute(rtw?.rtwRoute);
  const hasShareCode = !!normaliseShareCode(rtw?.shareCode);
  const typesWith = (statuses: readonly string[]) =>
    new Set(records.filter((r) => statuses.includes(r.status)).map((r) => r.type));
  // No route chosen (e.g. the office uploaded it for them): any Right to Work
  // record on file counts, so staff-added RTW isn't reported as missing.
  const anyRtw = (statuses: readonly string[]) =>
    records.some((r) => categoryForType(r.type) === "Right to Work" && statuses.includes(r.status));
  const rtwState = route
    ? rtwItemState(
        rtwProgress(route, typesWith(RTW_SATISFIED_STATUSES), hasShareCode).complete,
        rtwProgress(route, typesWith(["Verified"]), hasShareCode).complete
      )
    : rtwItemState(anyRtw(RTW_SATISFIED_STATUSES), anyRtw(["Verified"]));

  // Only REQUIRED types count. Counting every verified record the contractor
  // holds meant unrelated extras could push the bar to 100% while a required
  // document was still missing.
  const { total, submitted: completedCount, verified, score } = documentsScore({
    rtw: rtwState,
    cards: requiredTypes.map(cardState),
  });

  const otherRecords = records.filter(
    (r) => categoryForType(r.type) !== "Right to Work" && !requiredTypes.some((t) => recordMeetsSpec(t, r.type))
  );

  // Shown whatever the score says: an accepted alternative (NPORS for CSCS)
  // could otherwise hide a rejected card entirely (Jenni, 08-10-26).
  const rejected = records.filter((r) => r.status === REJECTED_STATUS);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-gray-900">Your cards and certificates</h2>

      {rejected.length > 0 && (
        <div className="space-y-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">
            ❌ {rejected.length === 1 ? "A document needs" : `${rejected.length} documents need`} uploading again
          </p>
          {rejected.map((r) => {
            const reason = reasonFromNote(r.notes);
            return (
              <div key={r.id} className="rounded-lg border border-red-200 bg-white p-3">
                <p className="text-sm font-medium text-gray-900">{r.type} was not accepted</p>
                {reason && <p className="mt-0.5 text-xs text-red-700">Reason: {reason}</p>}
                <div className="mt-2">
                  <ComplianceUploader
                    contractorId={contractorId}
                    docType={r.type}
                    label={r.type}
                    isResubmit
                    complianceRecordId={r.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="text-center">
          <p className={`text-4xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>
            {score}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {verified} of {total} documents verified (Right to Work and your cards)
          </p>
          {rtwState === "missing" && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              Your Right to Work is still needed — add it in the Right to Work section on{" "}
              <a href="/portal/documents" className="underline">My Documents</a>.
            </p>
          )}
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
        <h3 className="text-sm font-semibold text-gray-900">Required for your role</h3>

        {requiredTypes.map((reqType) => {
          const record = recordFor(reqType);
          const doc = record ? docByType[record.type] : undefined;
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

      {/* Additional records not in required list (RTW ones show in their own section) */}
      {otherRecords.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Other records</h3>
          {otherRecords.map((record) => (
              <div key={record.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{record.type}</p>
                  <Badge variant={record.status}>{record.status}</Badge>
                </div>
              </div>
            ))}
        </div>
      )}

    </div>
  );
}
