export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";

const statuses = ["All", "Pending", "Approved", "Rejected", "Invoiced"];
const PAGE_SIZE = 50;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";
  const currentPage = Math.max(1, parseInt(params?.page || "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "All") {
    where.status = statusFilter;
  }

  const [expenses, totalCount, statusCounts] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: {
        contractor: true,
        assignment: { include: { company: true } },
      },
      orderBy: { date: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.expense.count({ where }),
    prisma.expense.groupBy({ by: ["status"], where, _count: { status: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count.status])
  );
  const pendingCount = countByStatus["Pending"] || 0;
  const approvedCount = countByStatus["Approved"] || 0;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description={`${totalCount} expenses`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs text-orange-600">Awaiting Approval</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
          <p className="text-xs text-emerald-600">Approved</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">£{totalAmount.toFixed(2)}</p>
          <p className="text-xs text-blue-600">Page Total</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2">
        {statuses.map((s) => {
          const isActive =
            s === "All" ? !statusFilter || statusFilter === "All" : statusFilter === s;
          return (
            <Link
              key={s}
              href={s === "All" ? "/expenses" : `/expenses?status=${s}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      {/* Expense List */}
      {expenses.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Project / Assignment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${exp.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {exp.contractor.firstName} {exp.contractor.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{exp.category}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{exp.description}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {exp.assignment?.role ? `${exp.assignment.role} - ${exp.assignment.company.name}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    £{exp.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={exp.status}>{exp.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No expenses found.{" "}
            {statusFilter && (
              <Link href="/expenses" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            )}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} ({totalCount} expenses)
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/expenses?status=${statusFilter || "All"}&page=${currentPage - 1}`}
              aria-disabled={currentPage <= 1}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPage <= 1
                  ? "pointer-events-none bg-gray-50 text-gray-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/expenses?status=${statusFilter || "All"}&page=${currentPage + 1}`}
              aria-disabled={currentPage >= totalPages}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                currentPage >= totalPages
                  ? "pointer-events-none bg-gray-50 text-gray-300"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
