export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

const TREND_MONTHS = 6;

export default async function SpendDashboardPage() {
  // Bound the trend window at the DB level instead of scanning every invoice ever created
  const trendWindowStart = new Date();
  trendWindowStart.setMonth(trendWindowStart.getMonth() - (TREND_MONTHS - 1));
  trendWindowStart.setDate(1);
  trendWindowStart.setHours(0, 0, 0, 0);

  // Push all aggregation into the DB (counts/sums/group-bys) instead of pulling every
  // invoice + line + contractor into memory, which grows unbounded with the table.
  const [
    invoiceCount,
    totalSpendAgg,
    totalPaidAgg,
    totalOutstandingAgg,
    totalOverdueAgg,
    companyGroups,
    contractorGroups,
    trendInvoices,
    lineHoursAgg,
    latestInvoice,
  ] = await Promise.all([
    prisma.invoice.count(),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    prisma.invoice.aggregate({ _sum: { total: true }, where: { status: "Paid" } }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { in: ["Approved", "Sent"] } },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { in: ["Approved", "Sent"] }, dueDate: { lt: new Date() } },
    }),
    prisma.invoice.groupBy({
      by: ["companyId"],
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: "desc" } },
      take: 8,
    }),
    prisma.invoiceLine.groupBy({
      by: ["contractorId"],
      _sum: { amount: true, hours: true, overtimeHours: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    prisma.invoice.findMany({
      where: { periodEnd: { gte: trendWindowStart } },
      select: { periodEnd: true, total: true },
    }),
    prisma.invoiceLine.aggregate({ _sum: { hours: true, overtimeHours: true } }),
    prisma.invoice.findFirst({ orderBy: { periodEnd: "desc" } }),
  ]);

  const totalSpend = totalSpendAgg._sum.total || 0;
  const totalPaid = totalPaidAgg._sum.total || 0;
  const totalOutstanding = totalOutstandingAgg._sum.total || 0;
  const totalOverdue = totalOverdueAgg._sum.total || 0;

  // Spend by company (names looked up only for the top 8 companies returned by the group-by)
  const companyIds = companyGroups.map((g) => g.companyId);
  const companies = companyIds.length
    ? await prisma.company.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
  const companySpend = companyGroups.map((g) => ({
    name: companyNameById.get(g.companyId) || "Unknown",
    total: g._sum.total || 0,
    invoiceCount: g._count._all,
  }));

  // Spend by contractor (from invoice lines) — top 10 by spend
  const contractorIds = contractorGroups.map((g) => g.contractorId);
  const contractors = contractorIds.length
    ? await prisma.contractor.findMany({
        where: { id: { in: contractorIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const contractorNameById = new Map(
    contractors.map((c) => [c.id, `${c.firstName} ${c.lastName}`])
  );
  const contractorSpend = contractorGroups.map((g) => ({
    name: contractorNameById.get(g.contractorId) || "Unknown",
    total: g._sum.amount || 0,
    hours: (g._sum.hours || 0) + (g._sum.overtimeHours || 0),
  }));

  // Monthly spend trend (last 6 months) — only fetched invoices within the trend window
  const monthlySpend = new Map<string, number>();
  for (const inv of trendInvoices) {
    const key = `${inv.periodEnd.getFullYear()}-${String(inv.periodEnd.getMonth() + 1).padStart(2, "0")}`;
    monthlySpend.set(key, (monthlySpend.get(key) || 0) + inv.total);
  }
  const months = [...monthlySpend.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-TREND_MONTHS);
  const maxMonthly = Math.max(...months.map((m) => m[1]), 1);

  // Variance alerts
  const alerts: { type: string; message: string; severity: "warning" | "danger" | "info" }[] = [];
  if (totalOverdue > 0) {
    alerts.push({
      type: "Overdue",
      message: `${formatCurrency(totalOverdue)} in overdue invoices`,
      severity: "danger",
    });
  }
  // Check for high overtime spend
  const totalOvertimeHours = lineHoursAgg._sum.overtimeHours || 0;
  const totalRegularHours = lineHoursAgg._sum.hours || 0;
  if (totalRegularHours > 0 && totalOvertimeHours / (totalRegularHours + totalOvertimeHours) > 0.15) {
    alerts.push({
      type: "High Overtime",
      message: `Overtime is ${Math.round((totalOvertimeHours / (totalRegularHours + totalOvertimeHours)) * 100)}% of total hours — review staffing levels`,
      severity: "warning",
    });
  }
  // Average invoice value variance
  if (invoiceCount >= 2) {
    const avgTotal = totalSpend / invoiceCount;
    if (latestInvoice && latestInvoice.total > avgTotal * 1.5) {
      alerts.push({
        type: "Variance",
        message: `Latest invoice (${latestInvoice.invoiceNumber}) is ${Math.round((latestInvoice.total / avgTotal - 1) * 100)}% above average`,
        severity: "warning",
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spend Dashboard"
        description="Real-time workforce spend analysis and variance alerts"
        action={
          <Link
            href="/billing"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Billing
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Total Spend</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Paid</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Overdue</p>
          <p className={`mt-1 text-2xl font-bold ${totalOverdue > 0 ? "text-red-600" : "text-gray-400"}`}>
            {formatCurrency(totalOverdue)}
          </p>
        </div>
      </div>

      {/* Variance Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                alert.severity === "danger"
                  ? "border-red-200 bg-red-50"
                  : alert.severity === "warning"
                  ? "border-amber-200 bg-amber-50"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  alert.severity === "danger"
                    ? "bg-red-100"
                    : alert.severity === "warning"
                    ? "bg-amber-100"
                    : "bg-blue-100"
                }`}
              >
                <svg className={`h-4 w-4 ${
                  alert.severity === "danger" ? "text-red-600" : alert.severity === "warning" ? "text-amber-600" : "text-blue-600"
                }`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <p className={`text-sm font-semibold ${
                  alert.severity === "danger" ? "text-red-800" : alert.severity === "warning" ? "text-amber-800" : "text-blue-800"
                }`}>
                  {alert.type}
                </p>
                <p className={`text-sm ${
                  alert.severity === "danger" ? "text-red-700" : alert.severity === "warning" ? "text-amber-700" : "text-blue-700"
                }`}>
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Spend Trend (CSS bar chart) */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Spend Trend</h2>
          </div>
          <div className="p-6">
            {months.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No invoice data yet</p>
            ) : (
              <div className="space-y-3">
                {months.map(([month, amount]) => {
                  const pct = (amount / maxMonthly) * 100;
                  const [year, mon] = month.split("-");
                  const label = new Date(parseInt(year), parseInt(mon) - 1).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  });
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-gray-500 text-right">{label}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-lg flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(pct, 5)}%` }}
                        >
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">
                            {formatCurrency(amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Spend by Company */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Spend by Company</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {companySpend.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No data</div>
            ) : (
              companySpend.slice(0, 8).map((c) => {
                const pct = totalSpend > 0 ? Math.round((c.total / totalSpend) * 100) : 0;
                return (
                  <div key={c.name} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.invoiceCount} invoice(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.total)}</p>
                      <p className="text-xs text-gray-500">{pct}%</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Contractors by Spend */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Contractors by Spend</h2>
          </div>
          {contractorSpend.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-500">No data</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contractor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Hours</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total Spend</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Avg Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contractorSpend.map((c) => (
                  <tr key={c.name} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right">{c.hours.toFixed(1)}h</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(c.total)}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 text-right">
                      {c.hours > 0 ? formatCurrency(c.total / c.hours) + "/h" : "—"}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-500 text-right">
                      {totalSpend > 0 ? Math.round((c.total / totalSpend) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
