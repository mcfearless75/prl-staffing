export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { createCreditNote } from "../../actions";
import { SubmitButton } from "@/components/submit-button";

export default async function NewCreditNotePage({
  searchParams,
}: {
  searchParams?: Promise<{ invoiceId?: string; error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const invoiceId = params?.invoiceId;
  const error = params?.error;

  if (!invoiceId) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { company: true },
  });
  if (!invoice) notFound();

  const assignments = await prisma.assignment.findMany({
    where: { companyId: invoice.companyId },
    orderBy: { startDate: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Credit Note"
        description={`Against invoice ${invoice.invoiceNumber} — ${invoice.company.name}`}
      />

      {error === "invalid-amount" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Amount must be greater than zero.
        </div>
      )}
      {error === "missing-reason" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          A reason is required.
        </div>
      )}
      {error === "create-failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to create the credit note. Please try again.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 max-w-2xl">
        <form action={createCreditNote} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoice.id} />

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
            Invoice total: <span className="font-semibold text-gray-900">{formatCurrency(invoice.total)}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount (ex VAT) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                step={0.01}
                min={0.01}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700">
                VAT Rate (%)
              </label>
              <input
                type="number"
                id="vatRate"
                name="vatRate"
                defaultValue={20}
                step={0.5}
                min={0}
                max={100}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="assignmentId" className="block text-sm font-medium text-gray-700">
              Assignment (optional)
            </label>
            <select
              id="assignmentId"
              name="assignmentId"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No specific assignment</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.role}
                  {a.location ? ` — ${a.location}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <SubmitButton
              pendingLabel="Creating…"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Credit Note
            </SubmitButton>
            <Link
              href={`/billing/${invoice.id}`}
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
