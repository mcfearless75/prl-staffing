export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft, FileText, FolderOpen } from "lucide-react";

function generateDocRef(folder: string, subfolder: string | null, index: number): string {
  // Generate a reference from folder structure, e.g. "QMS-CTX-001"
  const folderMap: Record<string, string> = {
    "Context of Organisation": "CTX",
    "Quality Manual & Policy": "QMP",
    "Operational Processes": "OPS",
    "Core Procedures": "COR",
    "Master Document": "MDI",
    "Documents supplied": "SUP",
  };

  const prefix = folderMap[folder] || folder.substring(0, 3).toUpperCase();
  const sub = subfolder
    ? `-${subfolder.substring(0, 3).toUpperCase()}`
    : "";
  return `QMS-${prefix}${sub}-${String(index + 1).padStart(3, "0")}`;
}

export default async function DocumentIndexPage() {
  const documents = await prisma.qmsDocument.findMany({
    orderBy: [{ folder: "asc" }, { subfolder: "asc" }, { fileName: "asc" }],
  });

  const totalDocs = documents.length;
  const folders = [...new Set(documents.map((d) => d.folder))];
  const lastUpdated = documents.length > 0
    ? documents.reduce((latest, d) =>
        new Date(d.updatedAt) > new Date(latest.updatedAt) ? d : latest
      )
    : null;

  // Group documents by folder
  const grouped = new Map<string, typeof documents>();
  for (const doc of documents) {
    const key = doc.folder;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(doc);
  }

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Track index for doc ref generation
  let globalIndex = 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Document Index"
        description="Complete index of all QMS controlled documents"
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/qms/reports"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Reports
            </Link>
            <a
              href="/api/qms-reports/document-index"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Export to Excel
            </a>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalDocs}</p>
              <p className="text-xs text-gray-500">Total Documents</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5">
              <FolderOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-900">{folders.length}</p>
              <p className="text-xs text-purple-600">Folders</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">
                {lastUpdated ? formatDate(lastUpdated.updatedAt) : "N/A"}
              </p>
              <p className="text-xs text-emerald-600">Last Updated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Index grouped by folder */}
      {Array.from(grouped.entries()).map(([folder, docs]) => (
        <div key={folder} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <FolderOpen className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-900">{folder}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {docs.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Doc Ref
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Document Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Folder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Uploaded By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {docs.map((doc) => {
                  const ref = generateDocRef(doc.folder, doc.subfolder, globalIndex);
                  globalIndex++;
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-mono font-medium text-blue-600">
                        {ref}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 max-w-xs truncate">
                        {doc.fileName}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        v{doc.version}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {doc.subfolder ? `${doc.folder} / ${doc.subfolder}` : doc.folder}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 uppercase">
                          {doc.fileType}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                        {doc.uploadedBy || "\u2014"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {documents.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No documents found.{" "}
            <Link href="/qms/documents" className="text-blue-600 hover:underline">
              Upload documents
            </Link>{" "}
            to populate this index.
          </p>
        </div>
      )}

      <div className="text-xs text-gray-400">
        {totalDocs} document{totalDocs !== 1 ? "s" : ""} across {folders.length} folder{folders.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
