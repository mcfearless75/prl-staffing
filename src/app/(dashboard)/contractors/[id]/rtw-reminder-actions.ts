"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { sendRtwReminder } from "@/lib/rtw-reminder";

export type RtwReminderResult = { type: "ok" | "error"; message: string } | null;

export async function sendRtwReminderAction(contractorId: string): Promise<RtwReminderResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can send reminders." };

  const sentBy = guard.session.user.email || guard.session.user.name || "staff";
  try {
    const result = await sendRtwReminder(contractorId, sentBy);
    if (!result.ok) return { type: "error", message: result.error };
    await logActivity("Sent Right to Work Reminder", "Contractor", contractorId, `by ${sentBy}`);
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: "Right to Work reminder sent." };
  } catch (err) {
    console.error("[rtw-reminder] send failed:", err);
    return { type: "error", message: "Could not send the reminder. Please try again." };
  }
}
