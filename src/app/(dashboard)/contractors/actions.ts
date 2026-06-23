"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

type AssignResult = { type: "ok" | "moved" | "duplicate" | "error"; message: string } | null;

export async function quickAssignContractorFromProfile(
  _prevState: AssignResult,
  formData: FormData
): Promise<AssignResult> {
  const contractorId = formData.get("contractorId") as string;
  const companyId = formData.get("companyId") as string;
  const siteId = (formData.get("siteId") as string) || null;
  const departmentId = (formData.get("departmentId") as string) || null;
  const status = (formData.get("status") as string) || "Active";

  if (!companyId || !contractorId) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { isActive: true },
  });
  if (!company?.isActive) {
    return { type: "error", message: "Cannot assign to an inactive company. Reactivate it first." };
  }

  const existing = await prisma.assignment.findFirst({
    where: { contractorId, companyId, status: "Active" },
  });

  if (existing) {
    if (siteId || departmentId) {
      await prisma.assignment.update({
        where: { id: existing.id },
        data: {
          siteId: siteId || existing.siteId,
          departmentId: departmentId || existing.departmentId,
          status,
        },
      });
      revalidatePath(`/contractors/${contractorId}`);
      return { type: "moved", message: "Assignment updated with new site/department." };
    }
    return {
      type: "duplicate",
      message: "This contractor is already assigned to that company.",
    };
  }

  await prisma.assignment.create({
    data: {
      contractorId,
      companyId,
      siteId: siteId || null,
      departmentId: departmentId || null,
      role: "",
      status,
      startDate: new Date(),
    },
  });

  revalidatePath(`/contractors/${contractorId}`);
  return { type: "ok", message: "Assigned successfully." };
}

function extractContractorData(formData: FormData) {
  const dobRaw = formData.get("dateOfBirth") as string;
  return {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    personalEmail: formData.get("personalEmail") as string || null,
    phone: formData.get("phone") as string,
    jobTitle: formData.get("jobTitle") as string,
    dayRate: parseFloat(formData.get("dayRate") as string) || null,
    payRate: parseFloat(formData.get("payRate") as string) || null,
    chargeRate: parseFloat(formData.get("chargeRate") as string) || null,
    status: formData.get("status") as string,
    supplierId: (formData.get("supplierId") as string) || null,
    niNumber: formData.get("niNumber") as string,
    utrNumber: formData.get("utrNumber") as string,
    ir35Status: formData.get("ir35Status") as string,
    notes: formData.get("notes") as string,
    // Emergency contact
    emergencyContactName: formData.get("emergencyContactName") as string || null,
    emergencyContactPhone: formData.get("emergencyContactPhone") as string || null,
    emergencyContactRelation: formData.get("emergencyContactRelation") as string || null,
    // Personal details
    dateOfBirth: dobRaw ? new Date(dobRaw) : null,
    address: formData.get("address") as string || null,
    postcode: formData.get("postcode") as string || null,
    nextOfKin: formData.get("nextOfKin") as string || null,
    medicalNotes: formData.get("medicalNotes") as string || null,
  };
}

export async function createContractor(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const data = extractContractorData(formData);

    const contractor = await prisma.contractor.create({
      data: {
        ...data,
        supplierId: data.supplierId === "" ? null : data.supplierId,
      },
    });

    // Auto-create contractor portal login (password set via forgot-password flow)
    const tempHash = await bcrypt.hash(`temp-${Date.now()}`, 10);
    try {
      await prisma.contractorLogin.create({
        data: {
          contractorId: contractor.id,
          email: contractor.email,
          passwordHash: tempHash,
        },
      });
    } catch {
      // ContractorLogin may already exist if email was reused — safe to ignore
    }

    revalidatePath("/contractors");
    redirect("/contractors");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create contractor:", error);
    throw new Error("Failed to create contractor. Please try again.");
  }
}

export async function updateContractor(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const data = extractContractorData(formData);

    await prisma.contractor.update({
      where: { id },
      data: {
        ...data,
        supplierId: data.supplierId === "" ? null : data.supplierId,
      },
    });

    revalidatePath(`/contractors/${id}`);
    redirect(`/contractors/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update contractor:", error);
    throw new Error("Failed to update contractor. Please try again.");
  }
}

export async function deleteContractor(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    // Delete related records first (foreign key constraints)
    await prisma.timesheetEntry.deleteMany({
      where: { timesheet: { contractorId: id } },
    });
    await prisma.timesheetAuditLog.deleteMany({
      where: { timesheet: { contractorId: id } },
    });
    await prisma.timesheetApproval.deleteMany({
      where: { timesheet: { contractorId: id } },
    });
    await prisma.timesheet.deleteMany({ where: { contractorId: id } });
    await prisma.complianceRecord.deleteMany({ where: { contractorId: id } });
    await prisma.document.deleteMany({ where: { contractorId: id } });
    await prisma.invoiceLine.deleteMany({ where: { contractorId: id } });
    await prisma.assignment.deleteMany({ where: { contractorId: id } });
    await prisma.contractorLogin.deleteMany({ where: { contractorId: id } });

    await prisma.contractor.delete({
      where: { id },
    });

    revalidatePath("/contractors");
    redirect("/contractors");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete contractor:", error);
    throw new Error("Failed to delete contractor. Please try again.");
  }
}
