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
    where: { contractorId, companyId, status: { notIn: ["Completed"] } },
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
    email: (formData.get("email") as string).toLowerCase().trim(),
    personalEmail: (formData.get("personalEmail") as string || "").toLowerCase().trim() || null,
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
    // "notes" is omitted from the form when it holds structured JSON
    // (see ContractorForm) — undefined here means Prisma leaves the
    // existing column value untouched instead of nulling it out.
    ...(formData.has("notes") ? { notes: formData.get("notes") as string } : {}),
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

export type ContractorFormState = { error?: string };

function isUniqueEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    !!(error as { meta?: { target?: string[] } }).meta?.target?.includes("email")
  );
}

export async function createContractor(
  _prevState: ContractorFormState,
  formData: FormData
): Promise<ContractorFormState> {
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
    if (isUniqueEmailError(error)) {
      return { error: "A contractor with this email address already exists." };
    }
    console.error("Failed to create contractor:", error);
    return { error: "Failed to create contractor. Please try again." };
  }
}

export async function updateContractor(
  id: string,
  _prevState: ContractorFormState,
  formData: FormData
): Promise<ContractorFormState> {
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
    if (isUniqueEmailError(error)) {
      return { error: "A contractor with this email address already exists." };
    }
    console.error("Failed to update contractor:", error);
    return { error: "Failed to update contractor. Please try again." };
  }
}

export type ContractorDeleteResult = { type: "ok" | "error"; message: string } | null;

export async function deleteContractor(
  id: string,
  _prevState: ContractorDeleteResult,
  _formData: FormData
): Promise<ContractorDeleteResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Safety: refuse the delete outright if this contractor has invoice lines
  // on an invoice that has already left Draft (Reconciling, Approved, Sent,
  // Paid, Disputed). Those lines are part of a billing record that has been
  // reconciled or sent to the client — silently cascading the delete would
  // corrupt the line-item total on an invoice that may already be with the
  // customer. Returned (not thrown) so the reason reaches the user instead
  // of a generic error boundary or a raw FK constraint error.
  const issuedInvoiceLineCount = await prisma.invoiceLine.count({
    where: { contractorId: id, invoice: { status: { not: "Draft" } } },
  });

  if (issuedInvoiceLineCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — this contractor has ${issuedInvoiceLineCount} invoice line${issuedInvoiceLineCount === 1 ? "" : "s"} on invoice(s) that have already left Draft status. Resolve or credit those invoices first.`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Timesheet children (TimesheetEntry, TimesheetAuditLog,
      // TimesheetApproval) all declare onDelete: Cascade back to Timesheet
      // in the schema, so deleting the Timesheet rows below removes them
      // automatically at the DB level — no explicit deletes needed.
      await tx.timesheet.deleteMany({ where: { contractorId: id } });

      // Contractor-owned data with no significance once the contractor is
      // gone — safe to cascade.
      await tx.complianceRecord.deleteMany({ where: { contractorId: id } });
      await tx.document.deleteMany({ where: { contractorId: id } });
      await tx.contractorLogin.deleteMany({ where: { contractorId: id } });

      // Ending an assignment and later deleting the contractor is normal
      // lifecycle — assignment status (including Completed) never blocks.
      await tx.assignment.deleteMany({ where: { contractorId: id } });

      // Only Draft-invoice lines can reach here — the pre-flight check above
      // already refused the delete if any non-Draft lines exist. Re-scoping
      // to Draft here guards against a status change racing the check.
      await tx.invoiceLine.deleteMany({
        where: { contractorId: id, invoice: { status: "Draft" } },
      });

      await tx.contractor.delete({ where: { id } });
    });

    revalidatePath("/contractors");
    redirect("/contractors");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete contractor:", error);
    return { type: "error", message: "Failed to delete contractor. Please try again." };
  }
}
