import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";

export async function POST(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { session } = guard;

    const body = await request.json();
    const { contractorId, reason, requestedBy } = body;

    if (!contractorId || !requestedBy) {
      return NextResponse.json(
        { error: "Missing contractorId or requestedBy" },
        { status: 400 }
      );
    }

    // Verify contractor exists
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    const erasureRequest = await prisma.erasureRequest.create({
      data: {
        contractorId,
        email: contractor.email,
        requestedBy,
        reason: reason || null,
        status: "Pending",
      },
    });

    // Log the request
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Created Erasure Request",
        entityType: "ErasureRequest",
        entityId: erasureRequest.id,
        details: `GDPR erasure request created for ${contractor.firstName} ${contractor.lastName} — Reason: ${reason || "Not specified"}`,
      },
    });

    return NextResponse.json({ success: true, erasureRequest });
  } catch (error) {
    console.error("Erasure request error:", error);
    return NextResponse.json(
      { error: "Failed to create erasure request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const guard = await requireStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }

    const requests = await prisma.erasureRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Erasure list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch erasure requests" },
      { status: 500 }
    );
  }
}
