export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { Plus, Download, BarChart3 } from "lucide-react";

const statuses = ["All", "Draft", "Reconciling", "Approved", "Sent", "Paid", "Disputed"];

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "All") {
    where.status = statusFilter;
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      company: true,
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Summary stats
  const totalOutstanding = invoices
    .filter((i) => ["Approved", "Sent"].includes(i.status))
    .reduce((sum, i) => sum + i.total, 0);
  const totalPaid = invoices
    .filter((i) => i.status === "Paid")
    .reduce((sum, i) => sum + i.total, 0);
  const totalDraft = invoices
    .filter((i) => i.status === "Draft")
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Invoices"
        description="Auto-generated invoices from approved timesheets with Sage export"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/billing/aged"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Aged Debt
            </Link>
            <Link
              href="/billing/credit-notes"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Credit Notes
            </Link>
            <Link
              href="/billing/payments-import"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Import Payments
            </Link>
            <Link
              href="/billing/spend"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Spend Dashboard
            </Link>
            <Link
              href="/billing/generate"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Generate Invoices
            </Link>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Paid (Total)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase text-gray-500">Draft</p>
          <p className="mt-1 text-2xl font-bold text-gray-600">{formatCurrency(totalDraft)}</p>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s) => {
          const isActive =
            s === "All" ? !statusFilter || statusFilter === "All" : statusFilter === s;
          return (
            <Link
              key={s}
              href={s === "All" ? "/billing" : `/billing?status=${s}`}
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

      {/* Invoices Table */}
      {invoices.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Lines</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Match</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const isOverdue =
                  invoice.dueDate &&
                  new Date(invoice.dueDate) < new Date() &&
                  !["Paid", "Draft"].includes(invoice.status);
                return (
                  <tr key={invoice.id} className={`hover:bg-gray-50 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {invoice.company.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {invoice.lines.length}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={invoice.status}>{invoice.status}</Badge>
                        {isOverdue && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        invoice.matchStatus === "Matched"
                          ? "bg-emerald-100 text-emerald-700"
                          : invoice.matchStatus === "Partial"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {invoice.matchStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/billing/${invoice.id}`}
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
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No invoices found.{" "}
            <Link href="/billing/generate" className="text-blue-600 hover:underline">
              Generate your first invoice from approved timesheets
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
