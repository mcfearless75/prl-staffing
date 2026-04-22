import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    const sessionUser = session?.user as { contractorId?: string; userType?: string } | undefined;

    if (!sessionUser?.contractorId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      contractorId, phone, email, address, postcode,
      dateOfBirth, niNumber, nextOfKin,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    } = body;

    // Security: contractors can only update their own profile
    if (contractorId !== sessionUser.contractorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update contractor record — this updates the MAIN backend database
    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        phone: phone || null,
        email: email || null,
        address: address || null,
        postcode: postcode || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        niNumber: niNumber || null,
        nextOfKin: nextOfKin || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
      },
    });

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "UPDATE",
          entityType: "Contractor",
          entityId: contractorId,
          details: "Contractor updated their own profile via portal",
          userId: sessionUser.contractorId,
          userEmail: email || "contractor",
        },
      });
    } catch {
      // Don't fail the update if logging fails
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
