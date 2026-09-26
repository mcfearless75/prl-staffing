"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { sendComplianceReminder } from "@/lib/workflows/compliance-chase";

export type ReminderResult = { type: "ok" | "error"; message: string } | null;

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
      `${result.docCount} document(s) listed`
    );
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: `Reminder sent (${result.docCount} document${result.docCount === 1 ? "" : "s"}).` };
  } catch (err) {
    console.error("[compliance-reminder] send failed:", err);
    return { type: "error", message: "Could not send the reminder. Please try again." };
  }
}
