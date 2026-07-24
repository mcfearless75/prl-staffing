export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { computeOverdueTimesheets } from "@/lib/workflows/timesheet-chase";
import { ChaseTable } from "./chase-table";

export default async function TimesheetChasePage() {
  const overdue = await computeOverdueTimesheets();
  const totalMissingWeeks = overdue.reduce((sum, o) => sum + o.missingWeeks.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chase Overdue Timesheets"
        description={
          overdue.length > 0
            ? `${overdue.length} contractor(s), ${totalMissingWeeks} missing week(s) in the last 4 complete weeks`
            : "No missing timesheets in the last 4 complete weeks"
        }
        action={
          <Link
            href="/timesheets"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Timesheets
          </Link>
        }
      />

      <ChaseTable contractors={JSON.parse(JSON.stringify(overdue))} />
    </div>
  );
}
