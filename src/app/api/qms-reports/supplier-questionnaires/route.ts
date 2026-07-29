import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const questionnaires = await prisma.supplierQuestionnaire.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Fields are named explicitly rather than spread so supplier-supplied values
  // can never shadow id/createdAt/status.
  const responses = questionnaires.map((q) => ({
    id: q.id,
    createdAt: q.createdAt,
    companyName: q.companyName,
    tradingName: q.tradingName,
    companyRegNo: q.companyRegNo,
    vatNumber: q.vatNumber,
    registeredAddress: q.registeredAddress,
    mainContactName: q.mainContactName,
    contactEmail: q.contactEmail,
    contactPhone: q.contactPhone,
    website: q.website,
    goodsServices: q.goodsServices,
    numberOfEmployees: q.numberOfEmployees,
    yearsInBusiness: q.yearsInBusiness,
    iso9001: q.iso9001,
    otherCertifications: q.otherCertifications,
    publicLiability: q.publicLiability,
    publicLiabilityAmount: q.publicLiabilityAmount,
    employersLiability: q.employersLiability,
    employersLiabilityAmount: q.employersLiabilityAmount,
    professionalIndemnity: q.professionalIndemnity,
    professionalIndemnityAmount: q.professionalIndemnityAmount,
    healthSafetyPolicy: q.healthSafetyPolicy,
    environmentalPolicy: q.environmentalPolicy,
    equalityPolicy: q.equalityPolicy,
    ref1Company: q.ref1Company,
    ref1Contact: q.ref1Contact,
    ref1Email: q.ref1Email,
    ref1Phone: q.ref1Phone,
    ref2Company: q.ref2Company,
    ref2Contact: q.ref2Contact,
    ref2Email: q.ref2Email,
    ref2Phone: q.ref2Phone,
    additionalInfo: q.additionalInfo,
    signature: q.signature,
    submittedDate: q.submittedDate,
    status: q.status,
    reviewedBy: q.reviewedBy,
    reviewedAt: q.reviewedAt,
    notes: q.notes,
  }));

  return NextResponse.json(responses);
}
