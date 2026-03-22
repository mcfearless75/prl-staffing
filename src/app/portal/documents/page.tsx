export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentUploader } from "./document-uploader";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";

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
  for (const doc of documents) {
    if (!latestByType[doc.type] || doc.version > latestByType[doc.type].version) {
      latestByType[doc.type] = doc;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Documents</h1>
      <p className="text-sm text-gray-500">
        Upload your CSCS card, CV, P45, and other required documents. Use your camera to snap a photo or upload an existing file.
      </p>

      {/* Upload Section */}
      <DocumentUploader contractorId={contractorId} />

      {/* Document List */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Uploaded Documents</h2>
        {DOC_TYPES.map((docType) => {
          const doc = latestByType[docType.type];
          return (
            <div
              key={docType.type}
              className={`rounded-xl border bg-white px-4 py-3 ${
                doc ? "border-emerald-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{docType.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                    {doc ? (
                      <p className="text-xs text-gray-500">
                        {doc.fileName} (v{doc.version}) — {formatDate(doc.createdAt)}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">Not uploaded</p>
                    )}
                  </div>
                </div>
                {doc ? (
                  <Badge variant="Verified">Uploaded</Badge>
                ) : (
                  <Badge variant="Pending">Missing</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Documents are securely stored and only accessible by PRL Site Solutions staff.
        New uploads create a new version — previous versions are retained.
      </p>
    </div>
  );
}
