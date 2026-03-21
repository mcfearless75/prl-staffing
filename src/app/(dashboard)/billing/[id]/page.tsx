export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import {
  approveInvoice,
  markInvoiceSent,
  markInvoicePaid,
  deleteInvoice,
} from "../actions";

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount
  );
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      company: true,
      lines: {
        include: { contractor: true },
        orderBy: { description: "asc" },
      },
    },
  });

  if (!invoice) notFound();

  // Get linked timesheets for three-way match display
  const timesheetIds = invoice.lines.map((l) => l.timesheetId).filter(Boolean) as string[];
  const linkedTimesheets = await prisma.timesheet.findMany({
    where: { id: { in: timesheetIds } },
    include: { assignment: true },
  });

  // Three-way match check
  const hasTimesheets = timesheetIds.length > 0;
  const hasPO = !!invoice.poNumber;
  const matchChecks = [
    { label: "Purchase Order (PO)", matched: hasPO, detail: invoice.poNumber || "No PO linked" },
    { label: "Timesheets", matched: hasTimesheets, detail: `${timesheetIds.length} timesheet(s) linked` },
    { label: "Invoice", matched: true, detail: invoice.invoiceNumber },
  ];
  const matchCount = matchChecks.filter((c) => c.matched).length;

  const approveAction = approveInvoice.bind(null, invoice.id);
  const sentAction = markInvoiceSent.bind(null, invoice.id);
  const paidAction = markInvoicePaid.bind(null, invoice.id);
  const deleteAction = deleteInvoice.bind(null, invoice.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        description={invoice.company.name}
        action={
          <Badge variant={invoice.status} className="text-sm px-3 py-1">
            {invoice.status}
          </Badge>
        }
      />

      {/* Invoice Header — Requidex style */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Supplier</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">PRL Site Solutions</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Client</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{invoice.company.name}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Period</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Due Date</p>
            <p className={`mt-1 text-sm font-semibold ${
              invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== "Paid"
                ? "text-red-600"
                : "text-gray-900"
            }`}>
              {invoice.dueDate ? formatDate(invoice.dueDate) : "Not set"}
            </p>
          </div>
        </div>
        {invoice.poNumber && (
          <div className="mt-3 text-xs text-gray-500">
            <span className="font-medium">PO Reference:</span> {invoice.poNumber}
          </div>
        )}
      </div>

      {/* Invoice Lines — Requidex style table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">OT Hours</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Rate</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {invoice.lines.map((line) => (
              <tr key={line.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">{line.description}</td>
                <td className="px-6 py-3 text-sm text-gray-700 text-right">{line.hours}</td>
                <td className="px-6 py-3 text-sm text-right">
                  <span className={line.overtimeHours > 0 ? "text-orange-600 font-medium" : "text-gray-400"}>
                    {line.overtimeHours}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-700 text-right">{formatCurrency(line.rate)}</td>
                <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                  {formatCurrency(line.amount)}
                  {line.timesheetId && (
                    <span className="ml-1 text-emerald-500">✓</span>
                  )}
                </td>
              </tr>
            ))}
            {/* Subtotal */}
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-6 py-2 text-sm text-right text-gray-500">Subtotal</td>
              <td className="px-6 py-2 text-sm font-semibold text-gray-900 text-right">{formatCurrency(invoice.subtotal)}</td>
            </tr>
            {/* VAT */}
            <tr className="bg-gray-50">
              <td colSpan={4} className="px-6 py-2 text-sm text-right text-gray-500">VAT ({invoice.vatRate}%)</td>
              <td className="px-6 py-2 text-sm text-gray-700 text-right">{formatCurrency(invoice.vatAmount)}</td>
            </tr>
            {/* Total */}
            <tr className="bg-blue-50">
              <td colSpan={4} className="px-6 py-3 text-sm font-bold text-right text-gray-900">Total</td>
              <td className="px-6 py-3 text-lg font-bold text-blue-700 text-right">{formatCurrency(invoice.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Three-Way Matching — Requidex style */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Three-Way Matching</h2>
            <p className="text-xs text-gray-500 mt-0.5">Matching PO, timesheet, and invoice data</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            matchCount === 3
              ? "bg-emerald-100 text-emerald-700"
              : matchCount >= 2
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}>
            {matchCount}/3 checks complete
          </span>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {matchChecks.map((check, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg p-3 ${
                  check.matched ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    check.matched ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {check.matched ? "✓" : "—"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{check.label}</p>
                  <p className="text-xs text-gray-500">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {invoice.status === "Draft" && (
          <>
            <form action={approveAction}>
              <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors">
                Approve Invoice
              </button>
            </form>
            <form action={deleteAction}>
              <button type="submit" className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors">
                Delete Draft
              </button>
            </form>
          </>
        )}

        {invoice.status === "Approved" && (
          <form action={sentAction}>
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
              Mark as Sent
            </button>
          </form>
        )}

        {["Approved", "Sent"].includes(invoice.status) && (
          <form action={paidAction}>
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors">
              Mark as Paid
            </button>
          </form>
        )}

        {/* Sage Export */}
        <Link
          href={`/api/billing/sage-export?invoiceId=${invoice.id}`}
          className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors inline-flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export for Sage
        </Link>

        <Link
          href="/billing"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Billing
        </Link>
      </div>
    </div>
  );
}
