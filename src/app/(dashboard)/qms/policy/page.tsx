export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { AcknowledgeButton } from "./acknowledge-button";
import { FileCheck, FileText, FileSpreadsheet, Presentation, File, Download } from "lucide-react";
import Link from "next/link";

function getFileIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pdf": return <FileText className="h-4 w-4 text-red-500" />;
    case "docx": case "doc": return <FileText className="h-4 w-4 text-blue-500" />;
    case "xlsx": case "xls": return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case "pptx": case "ppt": return <Presentation className="h-4 w-4 text-orange-500" />;
    default: return <File className="h-4 w-4 text-gray-400" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default async function QualityPolicyPage() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  const [acknowledgements, relatedDocs] = await Promise.all([
    prisma.policyAcknowledgement.findMany({
      where: { policyVersion: "1.0" },
      orderBy: { acknowledgedAt: "desc" },
    }),
    prisma.qmsDocument.findMany({
      where: { folder: "Quality Manual & Policy" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasAcknowledged = user?.id
    ? acknowledgements.some((a) => a.userId === user.id)
    : false;

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Policy" />

      {/* Policy Document */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-lg bg-blue-100 p-2.5">
            <FileCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">PRL Site Solutions Quality Policy</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>Version: 1.0</span>
              <span>Effective: March 2026</span>
              <span>Approved By: Adella Thomas (Managing Director)</span>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            PRL Site Solutions is committed to providing high-quality recruitment and workforce
            management services. We are dedicated to:
          </p>
          <ul className="space-y-3 mt-4">
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              <span>Meeting and exceeding client expectations through reliable, compliant contractor placement.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              <span>Ensuring full regulatory compliance across all operations including IR35, right-to-work verification, and health &amp; safety standards.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              <span>Continuously improving our processes, systems, and services through regular review and innovation.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">4</span>
              <span>Maintaining transparent and auditable records across all aspects of our business.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">5</span>
              <span>Investing in our people, technology, and partnerships to deliver consistent, measurable quality.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Acknowledge Section */}
      {user?.id && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Policy Acknowledgement</h2>
          <p className="text-sm text-gray-600 mb-4">
            By acknowledging this policy, you confirm that you have read, understood, and agree to
            comply with the PRL Site Solutions Quality Policy.
          </p>
          <AcknowledgeButton
            userId={user.id}
            userEmail={user.email || ""}
            userName={user.name || ""}
            hasAcknowledged={hasAcknowledged}
          />
        </div>
      )}

      {/* Acknowledgement List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Staff Acknowledgements ({acknowledgements.length})
        </h2>
        {acknowledgements.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Policy Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acknowledged
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {acknowledgements.map((ack) => (
                  <tr key={ack.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {ack.userName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {ack.userEmail}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      v{ack.policyVersion}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(ack.acknowledgedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No acknowledgements yet.</p>
        )}
      </div>

      {/* Related Documents from Repository */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <span>📎</span> Related Documents from Repository
          </h3>
          <Link
            href="/qms/documents"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            View All Documents →
          </Link>
        </div>
        <p className="text-xs text-blue-700 mb-3">
          Documents from the &quot;Quality Manual &amp; Policy&quot; folder in the QMS Document Repository.
        </p>
        {relatedDocs.length > 0 ? (
          <div className="space-y-1">
            {relatedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 border border-blue-100 hover:border-blue-200 transition-colors"
              >
                {getFileIcon(doc.fileType)}
                <span className="truncate text-sm text-gray-900 flex-1 min-w-0 font-medium">
                  {doc.fileName}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatFileSize(doc.fileSize)}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatDate(doc.createdAt)}
                </span>
                <a
                  href={`/api/qms-documents/download?id=${doc.id}`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white border border-blue-100 px-4 py-6 text-center">
            <p className="text-sm text-gray-500">No documents uploaded to this folder yet.</p>
            <Link
              href="/qms/documents"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              Upload documents →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
