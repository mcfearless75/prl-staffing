import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { checkComplianceForAssignment } from "@/app/(dashboard)/assignments/actions";

/**
 * Staff-only: per-mandatory-requirement met/unmet summary for a contractor,
 * scoped to an (optional) role and companyId — used by the assignment form
 * to render a compliance panel before the assignment is saved.
 *
 * GET /api/contractors/[id]/compliance-summary?role=Electrician&companyId=xyz
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "";
  const companyId = searchParams.get("companyId") || undefined;

  const contractor = await prisma.contractor.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const result = await checkComplianceForAssignment({ contractorId: id, companyId, role });

  return NextResponse.json({
    contractorId: contractor.id,
    contractorName: `${contractor.firstName} ${contractor.lastName}`,
    allMet: result.allMet,
    requirements: result.requirements,
    missingTypes: result.missingTypes,
  });
}
