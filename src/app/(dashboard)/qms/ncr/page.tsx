export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { Plus, AlertTriangle } from "lucide-react";

export default async function NCRListPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; severity?: string; category?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params?.status || "";
  const severityFilter = params?.severity || "";
  const categoryFilter = params?.category || "";

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (severityFilter) where.severity = severityFilter;
  if (categoryFilter) where.category = categoryFilter;

  const [ncrs, openCount, inProgressCount, awaitingCount, closedCount, overdueCount] =
    await Promise.all([
      prisma.nonConformance.findMany({
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.nonConformance.count({ where: { status: "Open" } }),
      prisma.nonConformance.count({ where: { status: "In Progress" } }),
      prisma.nonConformance.count({ where: { status: "Awaiting Verification" } }),
      prisma.nonConformance.count({ where: { status: "Closed" } }),
      prisma.nonConformance.count({ where: { status: "Overdue" } }),
    ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Non-Conformance Register"
        description="Track NCRs, corrective actions, root cause analysis, and evidence of closure"
        action={
          <Link
            href="/qms/ncr/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Raise NCR
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-amber-600">{openCount}</div>
          <div className="text-xs text-gray-500">Open</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-purple-600">{awaitingCount}</div>
          <div className="text-xs text-gray-500">Awaiting Verification</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-2xl font-bold text-emerald-600">{closedCount}</div>
          <div className="text-xs text-gray-500">Closed</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-400"}`}>
            {overdueCount}
          </div>
          <div className="text-xs text-gray-500">Overdue</div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-4">
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Awaiting Verification">Awaiting Verification</option>
          <option value="Closed">Closed</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select
          name="severity"
          defaultValue={severityFilter}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Severities</option>
          <option value="Minor">Minor</option>
          <option value="Major">Major</option>
          <option value="Critical">Critical</option>
        </select>
        <select
          name="category"
          defaultValue={categoryFilter}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          <option value="Process">Process</option>
          <option value="Product">Product</option>
          <option value="Service">Service</option>
          <option value="Compliance">Compliance</option>
          <option value="H&S">H&amp;S</option>
          <option value="Documentation">Documentation</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
        {(statusFilter || severityFilter || categoryFilter) && (
          <Link
            href="/qms/ncr"
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </Link>
        )}
      </form>

      {/* NCR Table */}
      {ncrs.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    NCR Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Target Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ncrs.map((ncr) => {
                  const isOverdue =
                    ncr.status !== "Closed" &&
                    ncr.targetDate &&
                    new Date(ncr.targetDate) < now;

                  return (
                    <tr
                      key={ncr.id}
                      className={`hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50" : ""}`}
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {ncr.ncrNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {ncr.title}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {ncr.category}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={ncr.severity}>{ncr.severity}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {ncr.source}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {ncr.assignedTo || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          {ncr.targetDate ? formatDate(ncr.targetDate) : "—"}
                        </span>
                        {isOverdue && (
                          <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-red-500" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <Badge variant={ncr.status}>{ncr.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          href={`/qms/ncr/${ncr.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No non-conformances found.{" "}
            {statusFilter || severityFilter || categoryFilter ? (
              <Link href="/qms/ncr" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/qms/ncr/new" className="text-blue-600 hover:underline">
                Raise your first NCR
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
