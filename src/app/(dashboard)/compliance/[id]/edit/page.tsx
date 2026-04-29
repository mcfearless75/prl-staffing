export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ComplianceForm } from "@/components/compliance-form";
import { updateComplianceRecord } from "../../actions";
import { StaffDocUploader } from "./staff-doc-uploader";
import { formatDate } from "@/lib/utils";

export default async function EditComplianceRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, contractors] = await Promise.all([
    prisma.complianceRecord.findUnique({
      where: { id },
      include: { contractor: true },
    }),
    prisma.contractor.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  if (!record) {
    notFound();
  }

  // Get existing documents — match related types (e.g. Right to Work also shows Passport + Share Code)
  const relatedDocTypes: Record<string, string[]> = {
    "Right to Work": ["Right to Work", "Passport", "Share Code"],
  };
  const searchTypes = relatedDocTypes[record.type] ?? [record.type];
  const existingDocs = await prisma.document.findMany({
    where: {
      contractorId: record.contractorId,
      type: { in: searchTypes },
    },
    orderBy: { version: "desc" },
  });

  const updateAction = updateComplianceRecord.bind(null, record.id);

  const backUrl = `/contractors/${record.contractorId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Compliance Record"
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/compliance/${record.id}`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Back to Record
            </Link>
            <Link
              href={backUrl}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              ← Back to Profile
            </Link>
          </div>
        }
      />
      <ComplianceForm
        record={record}
        contractors={contractors}
        action={updateAction}
        backUrl={backUrl}
      />

      {/* Document Upload Section */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">
          📎 Upload Supporting Document
        </h3>
        <p className="text-xs text-blue-600 mb-4">
          Upload a document for {record.contractor.firstName} {record.contractor.lastName}&apos;s {record.type} record.
          Once uploaded, change the status above to &quot;Verified&quot; and save.
        </p>

        <StaffDocUploader
          contractorId={record.contractorId}
          docType={record.type}
          successMessage='Now change the status above to "Verified" and save.'
        />

        {/* Existing documents */}
        {existingDocs.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-600">Existing documents:</p>
            {existingDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-gray-500">
                    v{doc.version} · {formatDate(doc.createdAt)} · Uploaded by {doc.uploadedBy}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <a
                    href={`/api/documents/download?id=${doc.id}&view=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View
                  </a>
                  <a
                    href={`/api/documents/download?id=${doc.id}`}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
