export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { ReviewActions } from "./review-actions";

export default async function ComplianceReviewPage() {
  const records = await prisma.complianceRecord.findMany({
    where: { status: "Pending" },
    include: { contractor: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Review Queue"
        description="Pending records awaiting staff verification"
        action={
          <Link
            href="/compliance"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ← Compliance
          </Link>
        }
      />

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg
              className="h-6 w-6 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900">All caught up</p>
          <p className="mt-1 text-xs text-gray-500">No pending records</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const contractor = record.contractor;
            const initials = getInitials(contractor.firstName, contractor.lastName);

            return (
              <div
                key={record.id}
                className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Left: contractor info + record details */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {contractor.firstName} {contractor.lastName}
                      </Link>
                      <Badge variant="outline">{record.type}</Badge>
                    </div>
                    {record.documentName && (
                      <p className="truncate text-xs text-gray-500">
                        {record.documentName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Submitted {formatDate(record.createdAt)}
                    </p>
                    {record.filePath && (
                      <a
                        href={`/api/documents/download?key=${encodeURIComponent(record.filePath)}&view=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                      >
                        View Doc ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Right: action buttons */}
                <div className="shrink-0 pl-13 sm:pl-0">
                  <ReviewActions recordId={record.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
