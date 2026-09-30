"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { composeRtwReminder, sendRtwReminder } from "@/lib/rtw-reminder";
import { buildSentEmailRecord, type EmailPreviewResult } from "@/lib/sent-email-record";

export type RtwReminderResult = { type: "ok" | "error"; message: string } | null;

/** The email "Send RTW reminder" would send, for the preview modal. Sends nothing. */
export async function previewRtwReminderAction(contractorId: string): Promise<EmailPreviewResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "Only staff can send reminders." };
  try {
    const composed = await composeRtwReminder(contractorId);
    if (!composed) return { ok: false, error: "Contractor not found" };
    return { ok: true, email: composed.email, blockReason: composed.blockReason };
  } catch (err) {
    console.error("[rtw-reminder] preview failed:", err);
    return { ok: false, error: "Could not build the preview. Please try again." };
  }
}

export async function sendRtwReminderAction(contractorId: string): Promise<RtwReminderResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can send reminders." };

  const sentBy = guard.session.user.email || guard.session.user.name || "staff";
  try {
    const result = await sendRtwReminder(contractorId, sentBy);
    if (!result.ok) return { type: "error", message: result.error };
    await logActivity(
      "Sent Right to Work Reminder",
      "Contractor",
      contractorId,
      buildSentEmailRecord({ by: sentBy, ...result.email })
    );
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: "Right to Work reminder sent." };
  } catch (err) {
    console.error("[rtw-reminder] send failed:", err);
    return { type: "error", message: "Could not send the reminder. Please try again." };
  }
}
