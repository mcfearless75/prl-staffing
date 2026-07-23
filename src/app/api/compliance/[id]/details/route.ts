import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Captures the document number / expiry alongside a file upload, so a dragged
// CSCS card is fully recorded in one step instead of needing a separate edit.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorised" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const reference = typeof body.reference === "string" ? body.reference.trim() || null : undefined;
  const indefinite = body.indefiniteExpiry === true;
  const rawExpiry = typeof body.expiryDate === "string" ? body.expiryDate.trim() : "";

  let expiryDate: Date | null | undefined;
  if (indefinite) {
    expiryDate = null; // explicitly no expiry
  } else if (rawExpiry) {
    const parsed = new Date(rawExpiry);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
    }
    expiryDate = parsed;
  }

  if (reference === undefined && expiryDate === undefined) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  try {
    const record = await prisma.complianceRecord.update({
      where: { id },
      data: {
        ...(reference !== undefined ? { reference } : {}),
        ...(expiryDate !== undefined ? { expiryDate } : {}),
      },
      select: { contractorId: true },
    });

    revalidatePath("/compliance");
    revalidatePath(`/compliance/${id}`);
    revalidatePath(`/contractors/${record.contractorId}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Record not found or update failed" }, { status: 404 });
  }
}
