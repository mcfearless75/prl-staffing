"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { checkInMessageBody } from "@/lib/contractor-messages";
import { sendMessageToWorker } from "@/lib/contractor-messages-server";

export type CheckInResult = { ok: true; note: string } | { ok: false; error: string };

/**
 * "Message in app" on Today's Starters. Only the assignment id comes from the
 * page; the name and site in the text are read here, so nothing the browser
 * sends ends up in the worker's message.
 */
export async function sendCheckInMessage(assignmentId: string): Promise<CheckInResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "Not signed in as staff." };

  try {
    const a = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        location: true,
        site: { select: { name: true } },
        contractor: { select: { id: true, firstName: true } },
      },
    });
    if (!a) return { ok: false, error: "Assignment not found." };

    const result = await sendMessageToWorker({
      contractorId: a.contractor.id,
      body: checkInMessageBody(a.contractor.firstName, a.site?.name || a.location || ""),
      senderUserId: guard.session.user.id || null,
      senderName: guard.session.user.name || guard.session.user.email || "PRL",
    });
    if (!result.ok) return { ok: false, error: result.error };

    await logActivity("Message sent to worker", "Contractor", a.contractor.id, "First-day check-in (Today's Starters)");
    revalidatePath("/starters/today");
    revalidatePath("/messages");
    return {
      ok: true,
      note: result.emailedTo ? "Sent" : "Sent — but no real email on file, so they weren't told",
    };
  } catch (err) {
    console.error("Failed to send check-in message:", err);
    return { ok: false, error: "Failed to send. Please try again." };
  }
}
