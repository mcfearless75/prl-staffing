"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { portalFeatureEnabled } from "@/lib/portal-features";
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

  // The chase email sends workers to the portal Timesheets tab; while that is
  // hidden (portal-features.ts) it would point them at a page they can't see.
  if (!portalFeatureEnabled("timesheets")) {
    return {
      sent: 0, failed: 0, skippedNoEmail: 0,
      errors: ["Timesheets are switched off in the worker app, so chase emails are paused."],
    };
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
