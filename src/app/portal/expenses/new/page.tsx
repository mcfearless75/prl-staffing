export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ExpenseForm } from "./form";

export default async function PortalNewExpensePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  // Same active/placed filter as the timesheet self-service flow.
  const assignments = await prisma.assignment.findMany({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
    include: { company: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">New Expense</h1>
      <ExpenseForm
        contractorId={contractorId}
        assignments={JSON.parse(JSON.stringify(assignments))}
      />
    </div>
  );
}
