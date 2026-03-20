export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { deleteComplianceRecord } from "../actions";

export default async function ComplianceRecordPage({
  params,
}: {
  params: { id: string };
}) {
  const record = await prisma.complianceRecord.findUnique({
    where: { id: params.id },
    include: { contractor: true },
  });

  if (!record) {
    notFound();
  }

  const deleteAction = deleteComplianceRecord.bind(null, record.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Record"
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/compliance/${record.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <form action={deleteAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </form>
          </div>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Contractor */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Contractor
            </p>
            <div className="mt-1 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {getInitials(record.contractor.firstName, record.contractor.lastName)}
              </div>
              <Link
                href={`/contractors/${record.contractor.id}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                {record.contractor.firstName} {record.contractor.lastName}
              </Link>
            </div>
          </div>

          {/* Type */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </p>
            <p className="mt-1 text-sm text-gray-900">{record.type}</p>
          </div>

          {/* Document Name */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Document Name
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {record.documentName || "—"}
            </p>
          </div>

          {/* Reference */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Reference Number
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {record.reference || "—"}
            </p>
          </div>

          {/* Issue Date */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Issue Date
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {record.issueDate ? formatDate(record.issueDate) : "—"}
            </p>
          </div>

          {/* Expiry Date */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Expiry Date
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {record.expiryDate ? formatDate(record.expiryDate) : "—"}
            </p>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </p>
            <div className="mt-1">
              <Badge variant={record.status}>{record.status}</Badge>
            </div>
          </div>

          {/* Notes - full width */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
              {record.notes || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
