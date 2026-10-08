import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";
import { sendMessageToWorker } from "@/lib/contractor-messages-server";
import { REJECTED_STATUS, cleanReason, rejectionMessage, rejectionNote } from "@/lib/document-rejection";

const VALID_STATUSES = [
  "Verified",
  "Non-Compliant",
  "Pending",
  "Expiring",
  "Expired",
] as const;

type ValidStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status =
    body !== null && typeof body === "object" && "status" in body
      ? (body as Record<string, unknown>).status
      : undefined;

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as ValidStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const rejecting = status === REJECTED_STATUS;
  const reason = rejecting ? cleanReason((body as Record<string, unknown>).reason) : "";

  let before: { contractorId: string; type: string };
  try {
    before = await prisma.complianceRecord.update({
      where: { id },
      // A rejection keeps its reason on the record, which My Documents shows
      // until the worker uploads again (that upload overwrites the notes).
      data: { status: status as ValidStatus, ...(rejecting ? { notes: rejectionNote(reason, new Date()) } : {}) },
      select: { contractorId: true, type: true },
    });
  } catch {
    return NextResponse.json(
      { error: "Record not found or update failed" },
      { status: 404 }
    );
  }

  await logActivity(
    status === "Verified" ? "Document verified" : rejecting ? "Document rejected" : "Document status changed",
    "Contractor",
    before.contractorId,
    `${before.type} → ${status}${reason ? ` — ${reason}` : ""}`
  );

  // Rejecting used to change the status and nothing else: the worker was never
  // told (Jenni, 08-10-26). Tell them in the app, by email and push. A failed
  // notification doesn't undo the rejection; staff see it in the response.
  let workerTold = true;
  if (rejecting) {
    const user = guard.session.user as { id?: string; name?: string | null };
    const sent = await sendMessageToWorker({
      contractorId: before.contractorId,
      body: rejectionMessage(before.type, reason),
      senderUserId: user.id ?? null,
      senderName: user.name || "PRL Site Solutions",
    }).catch((err) => {
      console.error("[compliance status] rejection message failed:", err);
      return { ok: false as const, error: String(err) };
    });
    workerTold = sent.ok;
  }

  return NextResponse.json({ success: true, workerTold });
}
