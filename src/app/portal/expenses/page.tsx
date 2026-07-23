export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function PortalExpensesPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const expenses = await prisma.expense.findMany({
    where: { contractorId },
    include: {
      assignment: { include: { company: true } },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">My Expenses</h1>
        <Link
          href="/portal/expenses/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Expense
        </Link>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No expenses yet.{" "}
            <Link href="/portal/expenses/new" className="text-blue-600 hover:underline">
              Submit your first one.
            </Link>
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {exp.category} · {formatDate(exp.date)}
                </p>
                <p className="text-xs text-gray-500 truncate">{exp.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {exp.assignment?.role ? `${exp.assignment.role} - ${exp.assignment.company.name}` : "No assignment"}
                </p>
                {exp.status === "Rejected" && exp.rejectionReason && (
                  <p className="text-[10px] text-red-500 mt-0.5">{exp.rejectionReason}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <p className="text-sm font-bold text-gray-900">£{exp.amount.toFixed(2)}</p>
                <Badge variant={exp.status}>{exp.status}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
