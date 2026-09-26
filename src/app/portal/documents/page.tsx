export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentUploader } from "./document-uploader";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { DownloadButton } from "./download-button";
import { COMPLIANCE_TYPES } from "@/lib/compliance-types";
import { RtwSection } from "./rtw-section";
import { ComplianceChecklist } from "./compliance-checklist";
import { RTW_SATISFIED_STATUSES, maskShareCode, parseRtwRoute } from "@/lib/rtw-route";

// Prompted vault rows. Keys must be canonical compliance types — anything not in
// COMPLIANCE_TYPES is filtered out below rather than sitting here as a row that
// can never be satisfied, because the upload API rejects non-canonical types.
// Required = must-have for compliance. Optional = nice-to-have.
const PROMPTED_TYPES: Record<string, { label: string; icon: string; required?: boolean }> = {
  "Right to Work": { label: "Right to Work", icon: "✅" },
  Passport: { label: "Passport", icon: "🪪", required: true },
  "Share Code": { label: "Share Code (Right to Work)", icon: "✅" },
  CSCS: { label: "CSCS Card", icon: "🏗️", required: true },
  CCNSG: { label: "CCNSG Safety Passport", icon: "🦺", required: true },
  NPORS: { label: "NPORS (Plant Operator)", icon: "🚜" },
  "IPAF (3a / 3b)": { label: "IPAF (Powered Access)", icon: "🏗️" },
  PASMA: { label: "PASMA (Scaffolding)", icon: "🪜" },
  "First Aid at Work": { label: "First Aid at Work", icon: "🏥" },
  "Emergency First Aid at Work": { label: "Emergency First Aid at Work", icon: "🏥" },
  "Fire Marshal / Warden": { label: "Fire Marshal / Warden", icon: "🔥" },
  "Manual Handling": { label: "Manual Handling", icon: "📦" },
  "Asbestos Awareness": { label: "Asbestos Awareness", icon: "⚠️" },
  "Working at Height": { label: "Working at Height", icon: "🧗" },
  "Confined Space": { label: "Confined Space", icon: "🚧" },
  Qualification: { label: "Qualification / Cert", icon: "🎓" },
  "UK Driving Licence": { label: "UK Driving Licence", icon: "🚗" },
  "Driving Licence — Other Nationality": { label: "Driving Licence (Other Nationality)", icon: "🚗" },
  P45: { label: "P45", icon: "📋" },
  P60: { label: "P60", icon: "📋" },
  DBS: { label: "DBS Check", icon: "🔍" },
  Insurance: { label: "Insurance", icon: "🛡️" },
  "IR35 Assessment": { label: "IR35 Assessment", icon: "📝" },
  CV: { label: "CV / Resume", icon: "📄", required: true },
  Other: { label: "Other", icon: "📎" },
};

const PROMPTED_ROWS = COMPLIANCE_TYPES.filter((type) => type in PROMPTED_TYPES).map((type) => ({
  type,
  ...PROMPTED_TYPES[type],
}));

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");
  const justSubmitted = (await searchParams)?.submitted === "1";

  const [documents, rtw, satisfiedRecords] = await Promise.all([
    prisma.document.findMany({
      where: { contractorId },
      orderBy: [{ type: "asc" }, { version: "desc" }],
    }),
    prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { rtwRoute: true, shareCode: true },
    }),
    prisma.complianceRecord.findMany({
      where: { contractorId, status: { in: [...RTW_SATISFIED_STATUSES] } },
      select: { type: true },
    }),
  ]);

  // Group by type, show latest version
  const latestByType: Record<string, typeof documents[0]> = {};
  const allByType: Record<string, typeof documents> = {};
  for (const doc of documents) {
    if (!latestByType[doc.type] || doc.version > latestByType[doc.type].version) {
      latestByType[doc.type] = doc;
    }
    if (!allByType[doc.type]) allByType[doc.type] = [];
    allByType[doc.type].push(doc);
  }

  // Anything uploaded outside the prompted set still gets a row, so no document
  // the contractor has sent in is hidden from them.
  const vaultRows = [
    ...PROMPTED_ROWS,
    ...Object.keys(allByType)
      .filter((type) => !(type in PROMPTED_TYPES))
      .sort()
      .map((type) => ({ type, label: type, icon: "📎", required: false })),
  ];

  const uploadedCount = Object.keys(latestByType).length;
  const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Documents</h1>

      {justSubmitted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thanks — your details are submitted. Now add your Right to Work and your cards below.
        </div>
      )}

      <RtwSection
        contractorId={contractorId}
        route={parseRtwRoute(rtw?.rtwRoute)}
        maskedShareCode={rtw?.shareCode ? maskShareCode(rtw.shareCode) : null}
        satisfiedTypes={[...new Set(satisfiedRecords.map((r) => r.type))]}
      />

      <ComplianceChecklist contractorId={contractorId} />

      {/* Storage Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
            <p className="text-[10px] text-gray-500">Total Files</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{uploadedCount}</p>
            <p className="text-[10px] text-gray-500">Document Types</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {totalSize > 1048576
                ? `${(totalSize / 1048576).toFixed(1)}MB`
                : `${(totalSize / 1024).toFixed(0)}KB`}
            </p>
            <p className="text-[10px] text-gray-500">Storage Used</p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <DocumentUploader contractorId={contractorId} />

      {/* Document Vault */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">
          📁 Document Vault
        </h2>
        <p className="text-[10px] text-gray-400">
          All your uploaded documents are stored securely. Download anytime.
        </p>

        {vaultRows.map((docType) => {
          const doc = latestByType[docType.type];
          const versions = allByType[docType.type] || [];
          return (
            <div
              key={docType.type}
              className={`rounded-xl border bg-white overflow-hidden ${
                doc ? "border-emerald-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{docType.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                    {doc ? (
                      <p className="text-[10px] text-gray-500 truncate">
                        {doc.fileName} · v{doc.version} · {formatDate(doc.createdAt)}
                        {doc.fileSize > 1048576
                          ? ` · ${(doc.fileSize / 1048576).toFixed(1)}MB`
                          : ` · ${(doc.fileSize / 1024).toFixed(0)}KB`}
                      </p>
                    ) : (
                      <p className="text-[10px] text-gray-400">Not uploaded</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {doc ? (
                    <>
                      <a
                        href={`/api/documents/download?id=${doc.id}&view=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        View
                      </a>
                      <DownloadButton documentId={doc.id} fileName={doc.fileName} />
                    </>
                  ) : (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                      docType.required ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {docType.required ? "Required" : "Missing"}
                    </span>
                  )}
                </div>
              </div>

              {/* Version history - show if multiple versions */}
              {versions.length > 1 && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <p className="text-[10px] font-medium text-gray-500 mb-1">Previous versions:</p>
                  {versions.slice(1, 4).map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-0.5">
                      <span className="text-[10px] text-gray-400">
                        v{v.version} · {v.fileName} · {formatDate(v.createdAt)}
                      </span>
                      <DownloadButton documentId={v.id} fileName={v.fileName} size="small" />
                    </div>
                  ))}
                  {versions.length > 4 && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      +{versions.length - 4} older version{versions.length - 4 > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center pb-4">
        Documents are securely stored and only accessible by you and PRL Site Solutions staff.
        New uploads create a new version — previous versions are retained.
      </p>
    </div>
  );
}
