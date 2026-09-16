import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const guard = await requireContractor();
    if (!guard.ok) {
      return NextResponse.json({ error: "Not authenticated" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { contractorId: sessionContractorId } = guard;

    const body = await request.json();
    const {
      contractorId, phone, email, address, postcode,
      dateOfBirth, niNumber, nextOfKin,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    } = body;

    // Security: contractors can only update their own profile
    if (contractorId !== sessionContractorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Contractor.email is non-nullable and unique — it is the portal sign-in
    // identity, so a blank value can never be written.
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email address is required — it is how you sign in to the portal." },
        { status: 400 }
      );
    }

    // Update contractor record — this updates the MAIN backend database
    try {
      await prisma.contractor.update({
        where: { id: contractorId },
        data: {
          phone: phone || null,
          email: normalizedEmail,
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: "That email address is already in use by another worker." },
          { status: 409 }
        );
      }
      throw error;
    }

    // Log the activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "UPDATE",
          entityType: "Contractor",
          entityId: contractorId,
          details: "Contractor updated their own profile via portal",
          userId: sessionContractorId,
          userEmail: normalizedEmail,
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
