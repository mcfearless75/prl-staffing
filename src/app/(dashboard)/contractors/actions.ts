"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { parseAssignmentRateFields } from "@/lib/assignment-rates";
import { emailConfirmationError } from "@/lib/email-confirmation";
import { activateContractorForAssignment } from "@/lib/contractor-status";
import { normaliseKnownAs } from "@/lib/contractor-name";

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
  const projectId = (formData.get("projectId") as string) || null;
  const { chargeRate, payRate, rateBasis } = parseAssignmentRateFields(formData);

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
          projectId: projectId || existing.projectId,
          chargeRate: chargeRate ?? existing.chargeRate,
          payRate: payRate ?? existing.payRate,
          rateBasis: rateBasis || existing.rateBasis,
        },
      });
      await activateContractorForAssignment(contractorId, status);
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
      projectId,
      role: "",
      status,
      startDate: new Date(),
      chargeRate,
      payRate,
      rateBasis,
    },
  });

  await activateContractorForAssignment(contractorId, status);
  revalidatePath(`/contractors/${contractorId}`);
  return { type: "ok", message: "Assigned successfully." };
}

function extractContractorData(formData: FormData) {
  const dobRaw = formData.get("dateOfBirth") as string;
  return {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    knownAs: normaliseKnownAs(formData.get("knownAs"), (formData.get("firstName") as string) || ""),
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

// Authoritative gate behind the form's confirm-email field — a direct POST
// bypassing the browser could otherwise skip the client-side check entirely.
// `original` is the stored email (null when creating): an unchanged email on
// edit needs no confirmation, so a role-only edit saves without retyping it.
function validateEmailConfirmation(formData: FormData, original: string | null): string | null {
  return emailConfirmationError(
    original,
    (formData.get("email") as string) || "",
    (formData.get("confirmEmail") as string) || ""
  );
}

function isUniqueEmailError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    !!(error as { meta?: { target?: string[] } }).meta?.target?.includes("email")
  );
}

// RolePicker emits every selected id as its own hidden input sharing the
// `jobRoleIds` name — read the full array back with formData.getAll().
function extractRoleIds(formData: FormData): string[] {
  return Array.from(new Set((formData.getAll("jobRoleIds") as string[]).filter(Boolean)));
}

// Primary-role seed: only used when the submitted jobTitle is blank, so the
// free-text field always wins when the user has set one.
async function resolvePrimaryRoleName(roleIds: string[]): Promise<string | null> {
  if (roleIds.length === 0) return null;
  const primary = await prisma.jobRole.findUnique({
    where: { id: roleIds[0] },
    select: { name: true },
  });
  return primary?.name ?? null;
}

// Diffs the contractor's current ContractorJobRole rows against the
// submitted role ids and creates/deletes only what changed.
async function syncContractorJobRoles(
  tx: Prisma.TransactionClient,
  contractorId: string,
  roleIds: string[]
): Promise<void> {
  const existing = await tx.contractorJobRole.findMany({
    where: { contractorId },
    select: { id: true, jobRoleId: true },
  });
  const existingRoleIds = new Set(existing.map((r) => r.jobRoleId));

  const toAdd = roleIds.filter((roleId) => !existingRoleIds.has(roleId));
  const toRemoveIds = existing
    .filter((r) => !roleIds.includes(r.jobRoleId))
    .map((r) => r.id);

  if (toAdd.length > 0) {
    await tx.contractorJobRole.createMany({
      data: toAdd.map((jobRoleId) => ({ contractorId, jobRoleId })),
      skipDuplicates: true,
    });
  }
  if (toRemoveIds.length > 0) {
    await tx.contractorJobRole.deleteMany({ where: { id: { in: toRemoveIds } } });
  }
}

export async function createContractor(
  _prevState: ContractorFormState,
  formData: FormData
): Promise<ContractorFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const confirmError = validateEmailConfirmation(formData, null);
  if (confirmError) return { error: confirmError };
  try {
    const data = extractContractorData(formData);
    const roleIds = extractRoleIds(formData);

    // Primary-role seed: only fires when the submitted Job Title is blank.
    if (!data.jobTitle?.trim() && roleIds.length > 0) {
      const primaryRoleName = await resolvePrimaryRoleName(roleIds);
      if (primaryRoleName) data.jobTitle = primaryRoleName;
    }

    const contractor = await prisma.$transaction(async (tx) => {
      const created = await tx.contractor.create({
        data: {
          ...data,
          supplierId: data.supplierId === "" ? null : data.supplierId,
        },
      });
      await syncContractorJobRoles(tx, created.id, roleIds);
      return created;
    });

    // Auto-create contractor portal login (password set via forgot-password flow)
    let loginCreateFailed = false;
    try {
      const tempHash = await bcrypt.hash(`temp-${Date.now()}`, 10);
      await prisma.contractorLogin.create({
        data: {
          contractorId: contractor.id,
          email: contractor.email,
          passwordHash: tempHash,
        },
      });
    } catch (loginError) {
      // Only P2002 is genuinely ignorable — a ContractorLogin already exists
      // for this email because it was reused. Any other failure (bcrypt, DB
      // outage) leaves a contractor who can never sign in, so it has to be
      // surfaced rather than swallowed.
      const alreadyExists =
        loginError instanceof Prisma.PrismaClientKnownRequestError &&
        loginError.code === "P2002";
      if (!alreadyExists) {
        console.error("Failed to create contractor portal login:", loginError);
        loginCreateFailed = true;
      }
    }

    revalidatePath("/contractors");
    if (loginCreateFailed) {
      // Deliberately no redirect: the contractor record was created, but
      // staying on the form is the only way to get this in front of staff.
      return {
        error:
          "Contractor saved, but their portal login could not be created — they will not be able to sign in. Do not resubmit; report this so the login can be set up manually.",
      };
    }
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
  const existing = await prisma.contractor.findUnique({ where: { id }, select: { email: true } });
  if (!existing) return { error: "Contractor not found." };
  const confirmError = validateEmailConfirmation(formData, existing.email);
  if (confirmError) return { error: confirmError };
  try {
    const data = extractContractorData(formData);
    const roleIds = extractRoleIds(formData);

    // Primary-role seed: only fires when the submitted Job Title is blank.
    if (!data.jobTitle?.trim() && roleIds.length > 0) {
      const primaryRoleName = await resolvePrimaryRoleName(roleIds);
      if (primaryRoleName) data.jobTitle = primaryRoleName;
    }

    await prisma.$transaction(async (tx) => {
      await tx.contractor.update({
        where: { id },
        data: {
          ...data,
          supplierId: data.supplierId === "" ? null : data.supplierId,
        },
      });
      await syncContractorJobRoles(tx, id, roleIds);
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
