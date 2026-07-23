import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isValidComplianceType } from "@/lib/compliance-types";

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

  const type =
    body !== null && typeof body === "object" && "type" in body
      ? (body as Record<string, unknown>).type
      : undefined;

  if (typeof type !== "string" || !isValidComplianceType(type)) {
    return NextResponse.json(
      { error: "Invalid document type." },
      { status: 400 }
    );
  }

  try {
    const record = await prisma.complianceRecord.update({
      where: { id },
      data: { type },
      select: { contractorId: true },
    });

    // Type drives the dashboard grouping/filters and shows on the contractor
    // profile — refresh all of them so the change is reflected everywhere.
    revalidatePath("/compliance");
    revalidatePath(`/compliance/${id}`);
    revalidatePath(`/contractors/${record.contractorId}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Record not found or update failed" },
      { status: 404 }
    );
  }
}
