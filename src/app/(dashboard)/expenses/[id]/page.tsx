export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { approveExpense } from "../actions";
import { RejectExpenseControl } from "./reject-expense-control";
import { FileText } from "lucide-react";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      contractor: true,
      assignment: { include: { company: true } },
    },
  });

  if (!expense) {
    notFound();
  }

  const receipt = expense.receiptDocumentId
    ? await prisma.document.findUnique({ where: { id: expense.receiptDocumentId } })
    : null;

  const approveAction = approveExpense.bind(null, expense.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${expense.contractor.firstName} ${expense.contractor.lastName}`}
        description={`${expense.category} · ${formatDate(expense.date)}`}
        action={<Badge variant={expense.status} className="text-sm px-3 py-1">{expense.status}</Badge>}
      />

      {/* Expense Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Category</p>
            <p className="mt-1 text-sm text-gray-900">{expense.category}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Date</p>
            <p className="mt-1 text-sm text-gray-900">{formatDate(expense.date)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Amount</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">£{expense.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Project / Assignment</p>
            <p className="mt-1 text-sm text-gray-900">
              {expense.assignment
                ? `${expense.assignment.role} - ${expense.assignment.company.name}`
                : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <p className="text-xs font-medium uppercase text-gray-500">Description</p>
          <p className="mt-1 text-sm text-gray-700">{expense.description}</p>
        </div>

        {expense.status === "Rejected" && expense.rejectionReason && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-medium uppercase text-red-600">Rejection Reason</p>
            <p className="mt-1 text-sm text-red-700">{expense.rejectionReason}</p>
          </div>
        )}

        {expense.reviewedBy && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium uppercase text-gray-500">Reviewed</p>
            <p className="mt-1 text-sm text-gray-700">
              {expense.reviewedBy}
              {expense.reviewedAt && ` · ${formatDateTime(expense.reviewedAt)}`}
            </p>
          </div>
        )}
      </div>

      {/* Receipt */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
        </div>
        <div className="p-6">
          {receipt ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{receipt.fileName}</p>
                  <p className="text-xs text-gray-500">{formatDate(receipt.createdAt)}</p>
                </div>
              </div>
              <a
                href={`/api/documents/download?id=${receipt.id}&view=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
              >
                View Receipt
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No receipt attached.</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {expense.status === "Pending" && (
        <div className="flex flex-wrap items-start gap-3">
          <form action={approveAction}>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
            >
              Approve
            </button>
          </form>
          <RejectExpenseControl expenseId={expense.id} />
        </div>
      )}

      <Link
        href="/expenses"
        className="inline-block rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
      >
        Back to Expenses
      </Link>
    </div>
  );
}
