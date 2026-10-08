import { NextResponse } from "next/server";
import { requireContractor } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { SUBMIT_ACTION, pendingUploads } from "@/lib/document-submission";
import { notifyStaffOfSubmission, submissionEvents } from "@/lib/upload-notification";

/**
 * The worker presses "I've finished — submit my documents" (Jenni, 08-10-26).
 * The office gets one email listing everything uploaded since the last Submit.
 *
 * The Submit is only recorded once that email has gone: if it fails, the
 * worker is asked to try again and the morning workflow still sees the uploads
 * as unsubmitted, so the office hears either way.
 */
export async function POST() {
  const guard = await requireContractor();
  if (!guard.ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }
  const { contractorId } = guard;

  const pending = pendingUploads(await submissionEvents(contractorId));
  if (pending.length === 0) {
    return NextResponse.json({ error: "There's nothing new to send. Upload a document first." }, { status: 400 });
  }

  const sent = await notifyStaffOfSubmission(contractorId, pending);
  if (!sent) {
    return NextResponse.json(
      { error: "We couldn't let the office know just now. Please try again in a minute." },
      { status: 502 }
    );
  }

  await logActivity(SUBMIT_ACTION, "Contractor", contractorId, `${pending.length} document${pending.length === 1 ? "" : "s"}`);
  return NextResponse.json({ ok: true, count: pending.length });
}
