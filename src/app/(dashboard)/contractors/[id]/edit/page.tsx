export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ContractorForm } from "@/components/contractor-form";
import { updateContractor } from "../../actions";
import { StaffDocUploader } from "@/app/(dashboard)/compliance/[id]/edit/staff-doc-uploader";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  { type: "Passport", label: "Passport", emoji: "🛂" },
  { type: "Right to Work", label: "Right to Work", emoji: "✅" },
  { type: "Share Code", label: "Share Code", emoji: "🔑" },
  { type: "CSCS", label: "CSCS Card", emoji: "🪪" },
  { type: "CCNSG", label: "CCNSG Safety Passport", emoji: "⛑️" },
  { type: "DBS", label: "DBS Check", emoji: "🔍" },
];

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contractor, suppliers, documents, complianceRecords] = await Promise.all([
    prisma.contractor.findUnique({ where: { id } }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { contractorId: id },
      orderBy: [{ type: "asc" }, { version: "desc" }],
    }),
    prisma.complianceRecord.findMany({
      where: { contractorId: id },
      orderBy: { type: "asc" },
    }),
  ]);

  if (!contractor) {
    notFound();
  }

  const updateAction = updateContractor.bind(null, contractor.id);

  const docsByType = DOC_TYPES.map((dt) => ({
    ...dt,
    docs: documents.filter((d) => d.type === dt.type),
    record: complianceRecords.find((r) => r.type === dt.type) ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Contractor"
        action={
          <Link
            href={`/contractors/${id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back to Profile
          </Link>
        }
      />
      <ContractorForm
        contractor={contractor}
        suppliers={suppliers}
        action={updateAction}
      />

      {/* ── Documents Section ── */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Compliance Documents</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload Passport, CSCS, Right to Work, Share Code, DBS and other documents for {contractor.firstName} {contractor.lastName}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {docsByType.map(({ type, label, emoji, docs, record }) => (
            <div key={type} className="px-6 py-4 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base">{emoji}</span>
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                {/* Compliance record badge */}
                {record ? (
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                    record.status === "Verified" ? "bg-emerald-100 text-emerald-700" :
                    record.status === "Expiring" ? "bg-orange-100 text-orange-700" :
                    record.status === "Expired" || record.status === "Non-Compliant" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {record.status}
                    {record.expiryDate ? ` · expires ${new Date(record.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </span>
                ) : (
                  <a
                    href={`/compliance/new?contractorId=${id}`}
                    className="text-xs text-gray-400 hover:text-blue-600"
                  >
                    + Add record
                  </a>
                )}
                {record && (
                  <a href={`/compliance/${record.id}/edit`} className="text-xs text-gray-400 hover:text-blue-600 ml-1">
                    Edit record →
                  </a>
                )}
                {docs.length > 0 && (
                  <span className="ml-auto text-xs font-medium text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                    {docs.length} file{docs.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Existing files */}
              {docs.length > 0 && (
                <div className="space-y-1.5">
                  {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{doc.fileName}</p>
                        <p className="text-[10px] text-gray-400">
                          v{doc.version} · {formatDate(doc.createdAt)} · {doc.uploadedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
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
                          className="text-xs font-medium text-gray-500 hover:text-gray-800"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new */}
              <StaffDocUploader contractorId={id} docType={type} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
