export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentUploader } from "./document-uploader";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { DownloadButton } from "./download-button";

const DOC_TYPES = [
  { type: "CSCS", label: "CSCS Card", icon: "🏗️" },
  { type: "CV", label: "CV / Resume", icon: "📄" },
  { type: "P45", label: "P45", icon: "📋" },
  { type: "P60", label: "P60", icon: "📋" },
  { type: "Passport", label: "Passport / ID", icon: "🪪" },
  { type: "DBS", label: "DBS Check", icon: "🔍" },
  { type: "Insurance", label: "Insurance", icon: "🛡️" },
  { type: "Qualification", label: "Qualification / Cert", icon: "🎓" },
  { type: "Right to Work", label: "Right to Work", icon: "✅" },
  { type: "IR35 Assessment", label: "IR35 Assessment", icon: "📝" },
  { type: "Other", label: "Other", icon: "📎" },
];

export default async function PortalDocumentsPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const documents = await prisma.document.findMany({
    where: { contractorId },
    orderBy: [{ type: "asc" }, { version: "desc" }],
  });

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

  const uploadedCount = Object.keys(latestByType).length;
  const totalSize = documents.reduce((sum, d) => sum + d.fileSize, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Documents</h1>

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

        {DOC_TYPES.map((docType) => {
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
                    <DownloadButton documentId={doc.id} fileName={doc.fileName} />
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                      Missing
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
