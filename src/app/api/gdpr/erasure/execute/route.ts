import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { deleteFromR2 } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require staff auth with admin role
    const user = session.user as { userType?: string; role?: string };
    if (user.userType === "contractor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin role required to execute erasure" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { erasureRequestId } = body;

    if (!erasureRequestId) {
      return NextResponse.json(
        { error: "Missing erasureRequestId" },
        { status: 400 }
      );
    }

    const erasureRequest = await prisma.erasureRequest.findUnique({
      where: { id: erasureRequestId },
    });

    if (!erasureRequest) {
      return NextResponse.json(
        { error: "Erasure request not found" },
        { status: 404 }
      );
    }

    if (erasureRequest.status === "Completed") {
      return NextResponse.json(
        { error: "Erasure request already completed" },
        { status: 400 }
      );
    }

    const contractorId = erasureRequest.contractorId;
    if (!contractorId) {
      return NextResponse.json(
        { error: "No contractor linked to this erasure request" },
        { status: 400 }
      );
    }

    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    const dateStr = new Date().toISOString().split("T")[0];

    // 1. Delete documents from R2 and database
    const documents = await prisma.document.findMany({
      where: { contractorId },
    });

    for (const doc of documents) {
      try {
        await deleteFromR2(doc.storageKey);
      } catch (err) {
        console.error(`Failed to delete R2 object ${doc.storageKey}:`, err);
        // Continue even if R2 deletion fails
      }
    }

    await prisma.document.deleteMany({
      where: { contractorId },
    });

    // 2. Delete ContractorLogin record
    await prisma.contractorLogin.deleteMany({
      where: { contractorId },
    });

    // 3. Anonymise the contractor record
    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        firstName: "REDACTED",
        lastName: "REDACTED",
        email: `redacted-${contractorId}@deleted.local`,
        phone: null,
        niNumber: null,
        utrNumber: null,
        address: null,
        postcode: null,
        dateOfBirth: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emergencyContactRelation: null,
        medicalNotes: null,
        nextOfKin: null,
        notes: `Data erased per GDPR request on ${dateStr}`,
        status: "Inactive",
      },
    });

    // 4. Update ErasureRequest status
    await prisma.erasureRequest.update({
      where: { id: erasureRequestId },
      data: {
        status: "Completed",
        processedBy: session.user.email,
        processedAt: new Date(),
        notes: `Erasure executed on ${dateStr} by ${session.user.name}`,
      },
    });

    // 5. Log to ActivityLog
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Executed GDPR Erasure",
        entityType: "Contractor",
        entityId: contractorId,
        details: `GDPR right to erasure executed for ${contractor.firstName} ${contractor.lastName}. PII anonymised, ${documents.length} document(s) deleted, login record removed.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Erasure completed successfully",
      documentsDeleted: documents.length,
    });
  } catch (error) {
    console.error("Erasure execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute erasure" },
      { status: 500 }
    );
  }
}
