"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { validateMessageBody } from "@/lib/contractor-messages";
import { sendMessageToWorker } from "@/lib/contractor-messages-server";

export type MessageActionResult = { type: "ok" | "error"; message: string } | null;

/**
 * Staff → worker message from the profile's Messages tab. Sender identity
 * comes from the session, never the form.
 */
export async function sendStaffMessage(
  contractorId: string,
  _prev: MessageActionResult,
  formData: FormData
): Promise<MessageActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const valid = validateMessageBody(formData.get("body"));
  if (!valid.ok) return { type: "error", message: valid.error };

  try {
    const result = await sendMessageToWorker({
      contractorId,
      body: valid.body,
      senderUserId: guard.session.user.id || null,
      senderName: guard.session.user.name || guard.session.user.email || "PRL",
    });
    if (!result.ok) return { type: "error", message: result.error };

    await logActivity(
      "Message sent to worker",
      "Contractor",
      contractorId,
      result.emailedTo ? `Notified by email (${result.emailedTo})` : "No deliverable email — app only"
    );
    revalidatePath(`/contractors/${contractorId}`);
    revalidatePath("/messages");
    const notice = result.emailedTo
      ? `Sent — they've been emailed to look in the app.`
      : `Sent, but there's no real email on file so they haven't been told. Give them a call.`;
    return { type: "ok", message: result.hasAppLogin ? notice : `${notice} They have no app login yet.` };
  } catch (err) {
    console.error("Failed to send message to worker:", err);
    return { type: "error", message: "Failed to send. Please try again." };
  }
}
