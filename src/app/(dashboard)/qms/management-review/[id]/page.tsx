export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { updateReview, completeReview, deleteReview } from "../actions";
import Link from "next/link";

export default async function ManagementReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const review = await prisma.managementReview.findUnique({
    where: { id },
  });

  if (!review) {
    notFound();
  }

  // Auto-populate PRISM data
  const [
    contractorCount,
    activeAssignments,
    totalCompliance,
    verifiedCompliance,
    pendingTimesheets,
    totalInvoiced,
    openNCRs,
    closedNCRs,
    overdueNCRs,
    completedAudits,
    openFindings,
    highRisks,
    mediumRisks,
    lowRisks,
  ] = await Promise.all([
    prisma.contractor.count({ where: { status: "Active" } }),
    prisma.assignment.count({ where: { status: "Active" } }),
    prisma.complianceRecord.count(),
    prisma.complianceRecord.count({ where: { status: "Verified" } }),
    prisma.timesheet.count({ where: { status: { in: ["Submitted", "Draft"] } } }),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    prisma.nonConformance.count({ where: { status: { in: ["Open", "In Progress"] } } }),
    prisma.nonConformance.count({ where: { status: "Closed" } }),
    prisma.nonConformance.count({ where: { status: "Overdue" } }),
    prisma.internalAudit.count({ where: { status: "Completed" } }),
    prisma.auditFinding.count({ where: { status: { in: ["Open", "In Progress"] } } }),
    prisma.risk.count({ where: { riskLevel: { in: ["High", "Critical"] } } }),
    prisma.risk.count({ where: { riskLevel: "Medium" } }),
    prisma.risk.count({ where: { riskLevel: "Low" } }),
  ]);

  const compliancePct = totalCompliance > 0
    ? Math.round((verifiedCompliance / totalCompliance) * 100)
    : 0;

  const invoicedTotal = totalInvoiced._sum.total ?? 0;

  const updateAction = updateReview.bind(null, review.id);
  const completeAction = completeReview.bind(null, review.id);
  const deleteAction = deleteReview.bind(null, review.id);
  const isCompleted = review.status === "Completed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={review.title}
        description={`${review.reviewNumber} - ${formatDate(review.reviewDate)}`}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={review.status}>{review.status}</Badge>
            <Link
              href="/qms/management-review"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Back to List
            </Link>
            {!isCompleted && (
              <form action={deleteAction}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </form>
            )}
          </div>
        }
      />

      {/* Review Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Review Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Chairperson</p>
            <p className="text-sm text-gray-900">{review.chairperson}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Attendees</p>
            <p className="text-sm text-gray-900">{review.attendees || "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Review Date</p>
            <p className="text-sm text-gray-900">{formatDate(review.reviewDate)}</p>
          </div>
          {review.completedAt && (
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-sm text-gray-900">{formatDate(review.completedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Auto-populated PRISM Data */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI Summary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">KPI Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Active Contractors</span>
              <span className="font-semibold text-blue-900">{contractorCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Active Assignments</span>
              <span className="font-semibold text-blue-900">{activeAssignments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Compliance Rate</span>
              <span className="font-semibold text-blue-900">{compliancePct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Pending Timesheets</span>
              <span className="font-semibold text-blue-900">{pendingTimesheets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total Invoiced</span>
              <span className="font-semibold text-blue-900">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(invoicedTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* NCR Summary */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-semibold text-red-900 mb-3">NCR Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-red-700">Open</span>
              <span className="font-semibold text-red-900">{openNCRs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Closed</span>
              <span className="font-semibold text-red-900">{closedNCRs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-700">Overdue</span>
              <span className={`font-semibold ${overdueNCRs > 0 ? "text-red-900" : "text-emerald-700"}`}>
                {overdueNCRs}
              </span>
            </div>
          </div>
        </div>

        {/* Audit Summary */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <h3 className="text-sm font-semibold text-indigo-900 mb-3">Audit Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-indigo-700">Completed Audits</span>
              <span className="font-semibold text-indigo-900">{completedAudits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-indigo-700">Open Findings</span>
              <span className="font-semibold text-indigo-900">{openFindings}</span>
            </div>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
          <h3 className="text-sm font-semibold text-orange-900 mb-3">Risk Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-orange-700">High / Critical</span>
              <span className={`font-semibold ${highRisks > 0 ? "text-red-700" : "text-emerald-700"}`}>
                {highRisks}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Medium</span>
              <span className="font-semibold text-orange-900">{mediumRisks}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700">Low</span>
              <span className="font-semibold text-orange-900">{lowRisks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Sections */}
      <form action={updateAction} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Minutes</h2>
          <textarea
            name="minutes"
            rows={6}
            defaultValue={review.minutes || ""}
            disabled={isCompleted}
            placeholder="Record the key discussion points from the review meeting..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Decisions</h2>
          <textarea
            name="decisions"
            rows={4}
            defaultValue={review.decisions || ""}
            disabled={isCompleted}
            placeholder="Record key decisions made during the review..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Actions</h2>
          <textarea
            name="actions"
            rows={4}
            defaultValue={review.actions || ""}
            disabled={isCompleted}
            placeholder="Record actions arising from the review (e.g. action, owner, deadline)..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {!isCompleted && (
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Save Review
            </button>
          </div>
        )}
      </form>

      {/* Complete Button */}
      {!isCompleted && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-emerald-900">Complete Review</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Mark this review as completed. Ensure all minutes, decisions, and actions have been recorded.
              </p>
            </div>
            <form action={completeAction}>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
              >
                Complete Review
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
