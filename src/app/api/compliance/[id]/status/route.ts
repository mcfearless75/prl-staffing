import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

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

  try {
    const before = await prisma.complianceRecord.update({
      where: { id },
      data: { status: status as ValidStatus },
      select: { contractorId: true, type: true },
    });
    await logActivity(
      status === "Verified" ? "Document verified" : status === "Non-Compliant" ? "Document rejected" : "Document status changed",
      "Contractor",
      before.contractorId,
      `${before.type} → ${status}`
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Record not found or update failed" },
      { status: 404 }
    );
  }
}
