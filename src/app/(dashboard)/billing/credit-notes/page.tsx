export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, formatCurrency } from "@/lib/utils";

const statuses = ["All", "Draft", "Issued", "Processed"];

export default async function CreditNotesPage({
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

  const creditNotes = await prisma.creditNote.findMany({
    where,
    include: { company: true, invoice: true },
    orderBy: { createdAt: "desc" },
  });

  const totalValue = creditNotes.reduce((sum, cn) => sum + cn.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Notes"
        description="Adjustments issued against invoices"
        action={
          <Link
            href="/billing"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Billing
          </Link>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-5 sm:w-64">
        <p className="text-xs font-medium uppercase text-gray-500">Total Value</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((s) => {
          const isActive = s === "All" ? !statusFilter || statusFilter === "All" : statusFilter === s;
          return (
            <Link
              key={s}
              href={s === "All" ? "/billing/credit-notes" : `/billing/credit-notes?status=${s}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </div>

      {creditNotes.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Credit Note</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reason</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {creditNotes.map((cn) => (
                <tr key={cn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900">{cn.creditNoteNumber}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600">
                    <Link href={`/billing/${cn.invoiceId}`} className="hover:underline">
                      {cn.invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{cn.company.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cn.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-gray-900 text-right">{formatCurrency(cn.total)}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={cn.status}>{cn.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(cn.createdAt)}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link href={`/billing/credit-notes/${cn.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No credit notes found. Create one from an invoice&apos;s detail page.</p>
        </div>
      )}
    </div>
  );
}
