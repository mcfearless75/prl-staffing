/**
 * The worker's 48-hour waiver (Working Time Regulations 1998).
 *
 * GET /api/portal/waiver → their current decision + signature
 * PUT /api/portal/waiver → sign (or re-sign with a changed decision)
 *
 * Only ever the signed-in contractor's own row — the contractorId comes from
 * the session, never the request.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { parseWaiver, WAIVER_LABELS } from "@/lib/working-time-waiver";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const c = await prisma.contractor.findUnique({
    where: { id: guard.contractorId },
    select: { waiverDecision: true, waiverSignature: true, waiverSignedAt: true },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    decision: c.waiverDecision ?? "",
    signature: c.waiverSignature ?? "",
    signedAt: c.waiverSignedAt?.toISOString() ?? null,
  });
}

export async function PUT(request: Request) {
  const guard = await requireContractor();
  if (!guard.ok) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseWaiver(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const signedAt = new Date();
    await prisma.contractor.update({
      where: { id: guard.contractorId },
      data: {
        waiverDecision: parsed.value.decision,
        waiverSignature: parsed.value.signature,
        waiverSignedAt: signedAt,
      },
    });
    await logActivity(
      "48-hour waiver signed",
      "Contractor",
      guard.contractorId,
      `${WAIVER_LABELS[parsed.value.decision]} — signed "${parsed.value.signature}"`
    );
    return NextResponse.json({ success: true, signedAt: signedAt.toISOString() });
  } catch (error) {
    console.error("Waiver save failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
