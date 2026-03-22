export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
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

  // Get existing documents for this contractor + type
  const existingDocs = await prisma.document.findMany({
    where: {
      contractorId: record.contractorId,
      type: record.type,
    },
    orderBy: { version: "desc" },
  });

  const updateAction = updateComplianceRecord.bind(null, record.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Compliance Record" />
      <ComplianceForm
        record={record}
        contractors={contractors}
        action={updateAction}
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
                <a
                  href={`/api/documents/download?id=${doc.id}`}
                  className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
