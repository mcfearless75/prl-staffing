"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import {
  computeOverdueTimesheets,
  sendTimesheetChaseEmails,
  type ChaseSendResult,
} from "@/lib/workflows/timesheet-chase";

export async function sendTimesheetChase(contractorIds: string[]): Promise<ChaseSendResult> {
  const guard = await requireStaff();
  if (!guard.ok) {
    throw new Error(guard.reason === "forbidden" ? "Forbidden" : "Not authenticated");
  }

  if (contractorIds.length === 0) {
    return { sent: 0, failed: 0, skippedNoEmail: 0, errors: ["No contractors selected"] };
  }

  // Recompute overdue weeks at send time rather than trusting client-supplied
  // data, so a stale page (or tampered payload) can't produce an incorrect
  // ChaseLog entry.
  const overdue = await computeOverdueTimesheets();
  const sentBy = guard.session.user.email || guard.session.user.name || "staff";

  const result = await sendTimesheetChaseEmails(overdue, contractorIds, sentBy);

  revalidatePath("/timesheets/chase");
  return result;
}
