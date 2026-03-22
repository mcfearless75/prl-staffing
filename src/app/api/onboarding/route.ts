import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyName, companyAddress, companyRegNo,
      contactName, contactEmail, contactPhone,
      supplyOf, siteLocation, startDate,
      rates, breakdown, additionalInfo,
      firstName, lastName, dateOfBirth, niNumber, utrNumber,
      address, postcode,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
    } = body;

    if (!companyName || !contactName || !contactEmail) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required" },
        { status: 400 }
      );
    }

    const agreement = await prisma.supplyAgreement.create({
      data: {
        companyName,
        companyAddress: companyAddress || null,
        companyRegNo: companyRegNo || null,
        contactName,
        contactEmail,
        contactPhone: contactPhone || null,
        supplyOf: supplyOf || null,
        siteLocation: siteLocation || null,
        startDate: startDate ? new Date(startDate) : null,
        rates: rates ? JSON.stringify(rates) : null,
        breakdown: breakdown ? JSON.stringify(breakdown) : null,
        additionalInfo: additionalInfo || null,
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        niNumber: niNumber || null,
        utrNumber: utrNumber || null,
        address: address || null,
        postcode: postcode || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        status: "Pending",
      },
    });

    // TODO: Send notification email to PRL staff about new submission

    return NextResponse.json({
      success: true,
      id: agreement.id,
      message: "Supply agreement submitted successfully",
    });
  } catch (error) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
