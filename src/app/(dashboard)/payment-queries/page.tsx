export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";

export default async function PaymentQueriesPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "All") where.status = statusFilter;

  const [queries, counts] = await Promise.all([
    prisma.paymentQuery.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.paymentQuery.groupBy({ by: ["status"], _count: { status: true } }),
  ]);

  const countMap: Record<string, number> = { Open: 0, Assigned: 0, Resolved: 0, Closed: 0 };
  for (const c of counts) countMap[c.status] = c._count.status;

  const statuses = ["All", "Open", "Assigned", "Resolved", "Closed"];

  return (
    <div className="space-y-6">
      <PageHeader title="Payment Queries" description={`${queries.length} queries`} />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{countMap.Open}</p>
          <p className="text-xs font-medium text-red-600">Open</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{countMap.Assigned}</p>
          <p className="text-xs font-medium text-amber-600">Assigned</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{countMap.Resolved}</p>
          <p className="text-xs font-medium text-emerald-600">Resolved</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">{countMap.Closed}</p>
          <p className="text-xs font-medium text-gray-500">Closed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {statuses.map((s) => (
          <Link key={s} href={s === "All" ? "/payment-queries" : `/payment-queries?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              (s === "All" ? !statusFilter || statusFilter === "All" : statusFilter === s)
                ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>{s}</Link>
        ))}
      </div>

      {/* Table */}
      {queries.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Ticket</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Operative</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Week Ending</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Query Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {queries.map((q) => (
                <tr key={q.id} className={`hover:bg-gray-50 ${q.status === "Open" ? "bg-amber-50/40" : ""}`}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-blue-600">{q.ticketNumber}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{q.operativeName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{q.weekEnding}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{q.queryType}</td>
                  <td className="whitespace-nowrap px-6 py-4"><Badge variant={q.status}>{q.status}</Badge></td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{q.assignedTo || "—"}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(q.createdAt)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right"><Link href={`/payment-queries/${q.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No payment queries found.</p>
        </div>
      )}
    </div>
  );
}
