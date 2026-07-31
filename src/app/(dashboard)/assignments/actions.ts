"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { parseAssignmentRateFields } from "@/lib/assignment-rates";
import {
  ASSIGNMENT_STATUSES,
  LIVE_ASSIGNMENT_STATUSES,
  COMPLIANCE_GATED_STATUSES,
} from "@/lib/assignment-statuses";
import {
  activateContractorForAssignment as activateContractorIfInactive,
  deactivateContractorIfNoLiveWork,
} from "@/lib/contractor-status";

export type AssignmentFormState = { error?: string } | null;

// Shared with assignment-form.tsx so the form's override UI and this check can
// never disagree. See COMPLIANCE_GATED_STATUSES for why Holiday is in and
// Ending is out.
const GATED_STATUSES = COMPLIANCE_GATED_STATUSES;

export interface ComplianceRequirementCheck {
  type: string;
  description: string | null;
  met: boolean;
}

export interface ComplianceCheckResult {
  allMet: boolean;
  requirements: ComplianceRequirementCheck[];
  missingTypes: string[];
}

/**
 * Checks a contractor against the mandatory ComplianceRequirements that
 * apply to a given role (and, optionally, company). A requirement is met
 * when the contractor has a ComplianceRecord of that type with
 * status "Verified" and either indefiniteExpiry or an expiryDate in the
 * future.
 */
export async function checkComplianceForAssignment(params: {
  contractorId: string;
  companyId?: string | null;
  role: string;
}): Promise<ComplianceCheckResult> {
  const { contractorId, companyId, role } = params;

  const [requirements, contractor] = await Promise.all([
    prisma.complianceRequirement.findMany({ where: { isMandatory: true } }),
    prisma.contractor.findUnique({
      where: { id: contractorId },
      include: { compliances: true },
    }),
  ]);

  if (!contractor) {
    return { allMet: false, requirements: [], missingTypes: ["Contractor not found"] };
  }

  const applicable = requirements.filter((req) => {
    const roleMatch = req.role === "All" || req.role.toLowerCase() === role.trim().toLowerCase();
    const companyMatch = !req.companyId || req.companyId === companyId;
    return roleMatch && companyMatch;
  });

  const now = new Date();

  const requirementChecks: ComplianceRequirementCheck[] = applicable.map((req) => {
    const met = contractor.compliances.some((record) => {
      if (record.type !== req.type || record.status !== "Verified") return false;
      if (record.indefiniteExpiry) return true;
      return record.expiryDate ? new Date(record.expiryDate) > now : false;
    });
    return { type: req.type, description: req.description, met };
  });

  const missingTypes = [...new Set(requirementChecks.filter((r) => !r.met).map((r) => r.type))];

  return {
    allMet: missingTypes.length === 0,
    requirements: requirementChecks,
    missingTypes,
  };
}


/**
 * When an assignment stops being live (or is deleted), the contractor may no
 * longer be working anywhere.
 *
 * Now a thin alias over the shared helper. It used to carry its own copy of the
 * live-status list, which is exactly how a contractor once ended up Inactive and
 * "currently placed" at the same time — the copy here and the headcount queries
 * elsewhere disagreed about "Ending". Kept as a named wrapper only so the call
 * sites below read the same as before.
 */
async function deactivateContractorIfNoActiveAssignments(contractorId: string): Promise<void> {
  await deactivateContractorIfNoLiveWork(contractorId);
}

function isRedirectError(error: unknown): boolean {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") return true;
  return typeof (error as { digest?: string })?.digest === "string" && (error as { digest?: string }).digest!.startsWith("NEXT_REDIRECT");
}

/**
 * Runs the compliance gate for a Placed/Active save. Returns an error
 * message to surface to the user when the gate blocks the save, or the
 * (possibly annotated) notes string to persist when it doesn't.
 */
async function applyComplianceGate(params: {
  status: string;
  contractorId: string;
  companyId: string;
  role: string;
  notes: string;
  formData: FormData;
}): Promise<{ error: string } | { notes: string }> {
  const { status, contractorId, companyId, role, notes, formData } = params;

  if (!GATED_STATUSES.has(status)) {
    return { notes };
  }

  const check = await checkComplianceForAssignment({ contractorId, companyId, role });
  if (check.allMet) {
    return { notes };
  }

  const overrideCompliance = formData.get("overrideCompliance") === "on";
  if (!overrideCompliance) {
    return {
      error: `Cannot set status to ${status} — missing mandatory compliance: ${check.missingTypes.join(", ")}. Tick "Override compliance" and add a note to proceed anyway.`,
    };
  }

  const overrideNote = ((formData.get("complianceOverrideNote") as string) || "").trim();
  if (!overrideNote) {
    return { error: "An override note is required to bypass the compliance check." };
  }

  const annotatedNotes = notes ? `${notes}\n\nCompliance override: ${overrideNote}` : `Compliance override: ${overrideNote}`;
  return { notes: annotatedNotes };
}

export async function createAssignment(
  _prevState: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contractorId = formData.get("contractorId") as string;
  const companyId = formData.get("companyId") as string;
  const role = formData.get("role") as string;
  const location = formData.get("location") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const status = formData.get("status") as string;
  const poNumber = formData.get("poNumber") as string;
  const notesRaw = (formData.get("notes") as string) || "";

  const siteId = (formData.get("siteId") as string) || null;
  const departmentId = (formData.get("departmentId") as string) || null;

  const projectId = (formData.get("projectId") as string) || null;
  const { chargeRate, payRate, rateBasis } = parseAssignmentRateFields(formData);

  const comparatorRateRaw = formData.get("comparatorRate") as string;
  const comparatorRate = comparatorRateRaw ? parseFloat(comparatorRateRaw) : null;
  const awrExempt = formData.get("awrExempt") === "on";
  const awrStartDateRaw = formData.get("awrStartDate") as string;
  const awrStartDate = awrStartDateRaw ? new Date(awrStartDateRaw) : null;

  const gateResult = await applyComplianceGate({
    status,
    contractorId,
    companyId,
    role,
    notes: notesRaw,
    formData,
  });
  if ("error" in gateResult) {
    return { error: gateResult.error };
  }
  const notes = gateResult.notes;

  try {
    await prisma.assignment.create({
      data: {
        contractorId,
        companyId,
        siteId,
        departmentId,
        projectId,
        role,
        location,
        startDate,
        endDate,
        status,
        poNumber,
        notes,
        chargeRate,
        payRate,
        rateBasis,
        comparatorRate,
        awrExempt,
        awrStartDate,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to create assignment:", error);
    return { error: "Failed to create assignment. Please try again." };
  }

  await activateContractorIfInactive(contractorId, status);

  revalidatePath("/assignments");
  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath("/contractors");
  redirect("/assignments");
}

export async function updateAssignment(
  id: string,
  _prevState: AssignmentFormState,
  formData: FormData
): Promise<AssignmentFormState> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const contractorId = formData.get("contractorId") as string;
  const companyId = formData.get("companyId") as string;
  const role = formData.get("role") as string;
  const location = formData.get("location") as string;
  const startDate = new Date(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  const status = formData.get("status") as string;
  const poNumber = formData.get("poNumber") as string;
  const notesRaw = (formData.get("notes") as string) || "";

  const siteId = (formData.get("siteId") as string) || null;
  const departmentId = (formData.get("departmentId") as string) || null;

  const projectId = (formData.get("projectId") as string) || null;
  const { chargeRate, payRate, rateBasis } = parseAssignmentRateFields(formData);

  const comparatorRateRaw = formData.get("comparatorRate") as string;
  const comparatorRate = comparatorRateRaw ? parseFloat(comparatorRateRaw) : null;
  const awrExempt = formData.get("awrExempt") === "on";
  const awrStartDateRaw = formData.get("awrStartDate") as string;
  const awrStartDate = awrStartDateRaw ? new Date(awrStartDateRaw) : null;

  const gateResult = await applyComplianceGate({
    status,
    contractorId,
    companyId,
    role,
    notes: notesRaw,
    formData,
  });
  if ("error" in gateResult) {
    return { error: gateResult.error };
  }
  const notes = gateResult.notes;

  try {
    await prisma.assignment.update({
      where: { id },
      data: {
        contractorId,
        companyId,
        siteId,
        departmentId,
        projectId,
        role,
        location,
        startDate,
        endDate,
        status,
        poNumber,
        notes,
        chargeRate,
        payRate,
        rateBasis,
        comparatorRate,
        awrExempt,
        awrStartDate,
      },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("Failed to update assignment:", error);
    return { error: "Failed to update assignment. Please try again." };
  }

  await activateContractorIfInactive(contractorId, status);
  if (!GATED_STATUSES.has(status)) {
    await deactivateContractorIfNoActiveAssignments(contractorId);
  }

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${id}`);
  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath("/contractors");
  redirect(`/assignments/${id}`);
}

export async function updateAssignmentStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const validStatuses: readonly string[] = ASSIGNMENT_STATUSES;
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    if (GATED_STATUSES.has(status)) {
      const existing = await prisma.assignment.findUnique({ where: { id } });
      if (!existing) throw new Error("Assignment not found");

      const check = await checkComplianceForAssignment({
        contractorId: existing.contractorId,
        companyId: existing.companyId,
        role: existing.role,
      });
      if (!check.allMet) {
        throw new Error(
          `Cannot set status to ${status} — missing mandatory compliance: ${check.missingTypes.join(", ")}. Use the edit form to override.`
        );
      }
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: { status },
    });

    await activateContractorIfInactive(updated.contractorId, status);
    if (!GATED_STATUSES.has(status)) {
      await deactivateContractorIfNoActiveAssignments(updated.contractorId);
    }

    revalidatePath("/assignments");
    revalidatePath(`/assignments/${id}`);
    revalidatePath(`/contractors/${updated.contractorId}`);
    revalidatePath("/contractors");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Invalid status" ||
        error.message === "Assignment not found" ||
        error.message.startsWith("Cannot set status to"))
    )
      throw error;
    console.error("Failed to update assignment status:", error);
    throw new Error("Failed to update assignment status. Please try again.");
  }
}

export async function deleteAssignment(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const deleted = await prisma.assignment.delete({
      where: { id },
    });

    await deactivateContractorIfNoActiveAssignments(deleted.contractorId);

    revalidatePath("/assignments");
    revalidatePath(`/contractors/${deleted.contractorId}`);
    revalidatePath("/contractors");
    redirect("/assignments");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete assignment:", error);
    throw new Error("Failed to delete assignment. Please try again.");
  }
}
