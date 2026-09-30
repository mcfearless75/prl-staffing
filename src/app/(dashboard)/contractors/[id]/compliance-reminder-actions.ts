"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { composeComplianceReminder, sendComplianceReminder } from "@/lib/workflows/compliance-chase";
import { buildSentEmailRecord, type EmailPreviewResult } from "@/lib/sent-email-record";

export type ReminderResult = { type: "ok" | "error"; message: string } | null;

/** The email "Send Compliance Reminder" would send, for the preview modal. Sends nothing. */
export async function previewComplianceReminderAction(contractorId: string): Promise<EmailPreviewResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "Only staff can send reminders." };
  try {
    const composed = await composeComplianceReminder(contractorId);
    if (!composed) return { ok: false, error: "Contractor not found" };
    return { ok: true, email: composed.email, blockReason: composed.blockReason };
  } catch (err) {
    console.error("[compliance-reminder] preview failed:", err);
    return { ok: false, error: "Could not build the preview. Please try again." };
  }
}

export async function sendComplianceReminderAction(contractorId: string): Promise<ReminderResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can send reminders." };

  const sentBy = guard.session.user.email || guard.session.user.name || "staff";
  try {
    const result = await sendComplianceReminder(contractorId, sentBy);
    if (!result.ok) return { type: "error", message: result.error };

    await logActivity(
      "Sent Compliance Reminder",
      "Contractor",
      contractorId,
      buildSentEmailRecord({ by: sentBy, note: `${result.docCount} document(s) listed`, ...result.email })
    );
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: `Reminder sent (${result.docCount} document${result.docCount === 1 ? "" : "s"}).` };
  } catch (err) {
    console.error("[compliance-reminder] send failed:", err);
    return { type: "error", message: "Could not send the reminder. Please try again." };
  }
}
