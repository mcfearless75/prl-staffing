import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { userType?: string };
    if (user.userType === "contractor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { userType?: string };
    if (user.userType === "contractor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
