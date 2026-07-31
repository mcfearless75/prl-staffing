export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PortalTimesheetForm } from "./form";

export default async function PortalNewTimesheetPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  // Get active assignments for this contractor
  const assignments = await prisma.assignment.findMany({
    where: {
      contractorId,
      status: { in: [...LIVE_ASSIGNMENT_STATUSES] },
    },
    include: { company: true, site: true, department: true },
    orderBy: { startDate: "desc" },
  });

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900">New Timesheet</h1>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">You don&apos;t have any active assignments.</p>
          <p className="text-xs text-gray-400 mt-1">Contact PRL to get assigned to a project first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">New Timesheet</h1>
      <PortalTimesheetForm
        assignments={JSON.parse(JSON.stringify(assignments))}
        contractorId={contractorId}
      />
    </div>
  );
}
