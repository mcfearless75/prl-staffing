import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextRequest, NextResponse } from "next/server";

// Standard workforce statuses, plus applicant-pipeline values (Applied, Looking)
// that other flows may set. Legacy On Site / Benched / Pending Docs retired.
const VALID_STATUSES = [
  "New", "Active", "Suspended", "Inactive", "Left",
  "Applied", "Looking",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const contractor = await prisma.contractor.update({
    where: { id },
    data: { status },
    select: { id: true, firstName: true, lastName: true, status: true },
  });

  return NextResponse.json(contractor);
}
