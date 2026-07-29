import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const contractorId = (session?.user as { contractorId?: string })?.contractorId;

    if (!contractorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { type, reference, expiryDate } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    // Find existing compliance record
    const existing = await prisma.complianceRecord.findFirst({
      where: { contractorId, type },
    });

    if (existing) {
      // Update with additional details
      await prisma.complianceRecord.update({
        where: { id: existing.id },
        data: {
          ...(reference ? { reference } : {}),
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        },
      });
    } else {
      // No record yet (e.g. the document upload didn't create one) — create it
      // so the reference / expiry the contractor entered isn't silently lost
      await prisma.complianceRecord.create({
        data: {
          contractorId,
          type,
          status: "Pending",
          ...(reference ? { reference } : {}),
          ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
          notes: `Details submitted by contractor on ${new Date().toISOString().split("T")[0]}. Awaiting verification.`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portal compliance update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
