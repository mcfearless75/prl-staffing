"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import { greetingName } from "@/lib/contractor-name";
import {
  FINISH_NOTICE_ACTION,
  FINISH_NOTICE_SUBJECT,
  buildFinishNoticeEmail,
  finishItems,
  finishKey,
  finishNoticeBlockReason,
} from "@/lib/finish-notice";
import {
  buildSentEmailRecord,
  parseSentEmailRecord,
  type ComposedEmail,
  type EmailPreviewResult,
} from "@/lib/sent-email-record";

export type FinishNoticeResult = { type: "ok" | "error"; message: string } | null;

/** The notice as it would go right now. Preview and send both come from here. */
async function composeFinishNotice(
  contractorId: string
): Promise<{ email: ComposedEmail; key: string; blockReason: string | null } | null> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      email: true,
      emailBounced: true,
      firstName: true,
      knownAs: true,
      leavingDate: true,
      assignments: {
        select: { status: true, endDate: true, role: true, location: true, company: { select: { name: true } } },
      },
    },
  });
  if (!contractor) return null;

  const items = finishItems(contractor);
  const last = await prisma.activityLog.findFirst({
    where: { entityType: "Contractor", entityId: contractorId, action: FINISH_NOTICE_ACTION },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  return {
    key: finishKey(items),
    blockReason: finishNoticeBlockReason({
      email: contractor.email,
      emailBounced: contractor.emailBounced,
      items,
      lastSentKey: parseSentEmailRecord(last?.details)?.note ?? null,
    }),
    email: {
      to: contractor.email,
      subject: FINISH_NOTICE_SUBJECT,
      html: buildFinishNoticeEmail(greetingName(contractor), items),
    },
  };
}

/** For the preview modal. Sends nothing. */
export async function previewFinishNoticeAction(contractorId: string): Promise<EmailPreviewResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "Only staff can send this." };
  try {
    const composed = await composeFinishNotice(contractorId);
    if (!composed) return { ok: false, error: "Contractor not found" };
    return { ok: true, email: composed.email, blockReason: composed.blockReason };
  } catch (err) {
    console.error("[finish-notice] preview failed:", err);
    return { ok: false, error: "Could not build the preview. Please try again." };
  }
}

export async function sendFinishNoticeAction(contractorId: string): Promise<FinishNoticeResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can send this." };

  const sentBy = guard.session.user.email || guard.session.user.name || "staff";
  try {
    const composed = await composeFinishNotice(contractorId);
    if (!composed) return { type: "error", message: "Contractor not found" };
    if (composed.blockReason) return { type: "error", message: composed.blockReason };

    const result = await sendEmail({ ...composed.email, template: "finish-notice" });
    if (!result.success) return { type: "error", message: result.error ?? "Email send failed" };

    // The note is the key of the dates covered: the next preview compares
    // against it, so the same dates can't go twice but a changed date can.
    await logActivity(
      FINISH_NOTICE_ACTION,
      "Contractor",
      contractorId,
      buildSentEmailRecord({ by: sentBy, note: composed.key, ...composed.email })
    );
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: "Finish date sent." };
  } catch (err) {
    console.error("[finish-notice] send failed:", err);
    return { type: "error", message: "Could not send the email. Please try again." };
  }
}
