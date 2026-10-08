export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserPen } from "lucide-react";
import { DocumentUploader } from "./document-uploader";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { DownloadButton } from "./download-button";
import { ViewDocumentButton } from "./view-document-button";
import { RtwSection } from "./rtw-section";
import { ComplianceChecklist } from "./compliance-checklist";
import { SubmitDocuments } from "./submit-documents";
import { submissionEvents } from "@/lib/upload-notification";
import { pendingUploads, lastSubmittedAt } from "@/lib/document-submission";
import { RTW_SATISFIED_STATUSES, formatShareCode, normaliseShareCode, parseRtwRoute, rtwProgress } from "@/lib/rtw-route";

// Friendlier labels and icons for uploaded documents in the vault. A type not
// listed here shows under its own name with a 📎.
const DOC_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  "Right to Work": { label: "Right to Work", icon: "✅" },
  Passport: { label: "Passport", icon: "🪪" },
  "Share Code": { label: "Share Code (Right to Work)", icon: "✅" },
  CSCS: { label: "CSCS Card", icon: "🏗️" },
  CCNSG: { label: "CCNSG Safety Passport", icon: "🦺" },
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
  CV: { label: "CV / Resume", icon: "📄" },
  Other: { label: "Other", icon: "📎" },
};

export default async function PortalDocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ submitted?: string }>;
}) {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");
  const justSubmitted = (await searchParams)?.submitted === "1";

  const [documents, rtw, satisfiedRecords, events] = await Promise.all([
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
    submissionEvents(contractorId),
  ]);
  const pendingCount = pendingUploads(events).length;
  const submittedAt = lastSubmittedAt(events);

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

  // Same test as the RTW section's "Done" badge and the home-page banner, so
  // the message never asks for a Right to Work the section says is finished.
  const rtwDone = rtwProgress(
    parseRtwRoute(rtw?.rtwRoute),
    new Set(satisfiedRecords.map((r) => r.type)),
    !!normaliseShareCode(rtw?.shareCode)
  ).complete;

  // Document Vault: only what they HAVE uploaded, newest first (Jenni,
  // 2026-10-08). A row for every type they hadn't uploaded made the vault look
  // like a long to-do list, when most types don't apply to most workers. What
  // IS required is the checklist above; the upload drop-down lists every type.
  const vaultRows = Object.keys(latestByType)
    .sort((a, b) => latestByType[b].createdAt.getTime() - latestByType[a].createdAt.getTime())
    .map((type) => ({
      type,
      label: DOC_TYPE_DISPLAY[type]?.label ?? type,
      icon: DOC_TYPE_DISPLAY[type]?.icon ?? "📎",
    }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
        <Link
          href="/portal/profile"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <UserPen className="h-4 w-4" /> Change my details
        </Link>
      </div>

      {justSubmitted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Thanks — your details are submitted.{" "}
          {rtwDone ? "Now add your cards and certificates below." : "Now add your Right to Work and your cards below."}
          Spotted a mistake? <Link href="/portal/profile" className="font-medium underline">Go back and change your details</Link>.
        </div>
      )}

      <RtwSection
        contractorId={contractorId}
        route={parseRtwRoute(rtw?.rtwRoute)}
        shareCode={rtw?.shareCode ? formatShareCode(rtw.shareCode) : null}
        satisfiedTypes={[...new Set(satisfiedRecords.map((r) => r.type))]}
      />

      <ComplianceChecklist contractorId={contractorId} />

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

        {vaultRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
            No documents uploaded yet. Use the upload box above to add your first one.
          </div>
        )}

        {vaultRows.map((docType) => {
          const doc = latestByType[docType.type];
          const versions = allByType[docType.type] || [];
          return (
            <div
              key={docType.type}
              className="rounded-xl border border-emerald-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{docType.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {doc.fileName} · v{doc.version} · {formatDate(doc.createdAt)}
                      {doc.fileSize > 1048576
                        ? ` · ${(doc.fileSize / 1048576).toFixed(1)}MB`
                        : ` · ${(doc.fileSize / 1024).toFixed(0)}KB`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ViewDocumentButton documentId={doc.id} fileName={doc.fileName} mimeType={doc.mimeType} />
                  <DownloadButton documentId={doc.id} fileName={doc.fileName} />
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

      {/* Keyed so a new upload after a Submit brings the button back. */}
      <SubmitDocuments
        key={pendingCount}
        pendingCount={pendingCount}
        lastSubmittedAt={submittedAt?.toISOString() ?? null}
      />

      <p className="text-[10px] text-gray-400 text-center pb-4">
        Documents are securely stored and only accessible by you and PRL Site Solutions staff.
        New uploads create a new version — previous versions are retained.
      </p>
    </div>
  );
}
