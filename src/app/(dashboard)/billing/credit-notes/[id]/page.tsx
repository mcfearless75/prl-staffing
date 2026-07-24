export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { issueCreditNote, markCreditNoteProcessed } from "../../actions";

export default async function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creditNote = await prisma.creditNote.findUnique({
    where: { id },
    include: { company: true, invoice: true, assignment: true },
  });

  if (!creditNote) notFound();

  const issueAction = issueCreditNote.bind(null, creditNote.id);
  const processAction = markCreditNoteProcessed.bind(null, creditNote.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Credit Note ${creditNote.creditNoteNumber}`}
        description={creditNote.company.name}
        action={
          <Badge variant={creditNote.status} className="text-sm px-3 py-1">
            {creditNote.status}
          </Badge>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Invoice</p>
            <p className="mt-1 text-sm font-semibold text-blue-600">
              <Link href={`/billing/${creditNote.invoiceId}`} className="hover:underline">
                {creditNote.invoice.invoiceNumber}
              </Link>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Client</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{creditNote.company.name}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Assignment</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {creditNote.assignment ? creditNote.assignment.role : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-[10px] font-medium uppercase text-gray-500">Created</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(creditNote.createdAt)}</p>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <span className="font-medium">Reason:</span> {creditNote.reason}
        </div>
        {creditNote.processedAt && (
          <div className="mt-1 text-xs text-gray-500">
            <span className="font-medium">Processed:</span> {formatDate(creditNote.processedAt)} by{" "}
            {creditNote.processedBy || "—"}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="px-6 py-3 text-sm text-right text-gray-500">Amount</td>
              <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                {formatCurrency(creditNote.amount)}
              </td>
            </tr>
            <tr className="bg-gray-50">
              <td className="px-6 py-2 text-sm text-right text-gray-500">VAT ({creditNote.vatRate}%)</td>
              <td className="px-6 py-2 text-sm text-gray-700 text-right">{formatCurrency(creditNote.vatAmount)}</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="px-6 py-3 text-sm font-bold text-right text-gray-900">Total</td>
              <td className="px-6 py-3 text-lg font-bold text-blue-700 text-right">
                {formatCurrency(creditNote.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {creditNote.status === "Draft" && (
          <form action={issueAction}>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Mark Issued
            </button>
          </form>
        )}
        {creditNote.status === "Issued" && (
          <form action={processAction}>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              Mark Processed
            </button>
          </form>
        )}
        <Link
          href="/billing/credit-notes"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Credit Notes
        </Link>
      </div>
    </div>
  );
}
