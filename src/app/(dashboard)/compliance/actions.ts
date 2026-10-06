"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { categoryForType } from "@/lib/compliance-types";

export async function createComplianceRecord(formData: FormData) {
  return createRecord(formData, false);
}

/** Same, for "+ Add Compliance Record" on a subcontractor profile: saving returns there, not to /compliance. */
export async function createComplianceRecordFromProfile(formData: FormData) {
  return createRecord(formData, true);
}

/** Inserts the record from the form fields and logs it. Shared by both create paths. */
async function insertRecord(formData: FormData) {
  const contractorId = formData.get("contractorId") as string;
  const type = formData.get("type") as string;
  const documentName = formData.get("documentName") as string;
  const reference = formData.get("reference") as string;
  const issueDateRaw = formData.get("issueDate") as string;
  const expiryDateRaw = formData.get("expiryDate") as string;
  const status = formData.get("status") as string;
  const notes = formData.get("notes") as string;

  const record = await prisma.complianceRecord.create({
    data: {
      contractorId,
      type,
      documentName,
      reference,
      issueDate: issueDateRaw ? new Date(issueDateRaw) : null,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      status,
      notes,
    },
  });
  await logActivity("Document record added", "Contractor", contractorId, `${type} (${status})`);
  revalidatePath("/compliance");
  return record;
}

/** Where a new record lands after saving: the profile tab it belongs on, or /compliance. */
function destinationAfterCreate(contractorId: string, type: string, backToProfile: boolean) {
  if (backToProfile && contractorId) {
    const tab = categoryForType(type) === "Right to Work" ? "Right to Work" : "Comps & Certs";
    revalidatePath(`/contractors/${contractorId}`);
    return `/contractors/${contractorId}?tab=${encodeURIComponent(tab)}`;
  }
  return "/compliance";
}

async function createRecord(formData: FormData, backToProfile: boolean) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const record = await insertRecord(formData);
    redirect(destinationAfterCreate(record.contractorId, record.type, backToProfile));
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create compliance record:", error);
    throw new Error("Failed to create compliance record. Please try again.");
  }
}

export type CreateForUploadResult =
  | { ok: true; id: string; contractorId: string; type: string; redirectTo: string }
  | { ok: false; error: string };

/**
 * Create-with-attachment, step 1 of 3. Used by ComplianceForm when a file is
 * attached on create: it returns the new id instead of redirecting, so the
 * browser can upload the file through the normal POST /api/documents route
 * (same R2 path, size and type checks as the edit-page uploader), then call
 * `reapplyRecordAfterUpload`, then navigate to `redirectTo`.
 *
 * Bind `backToProfile` in the page: `createComplianceRecordForUpload.bind(null, true)`.
 */
export async function createComplianceRecordForUpload(
  backToProfile: boolean,
  formData: FormData
): Promise<CreateForUploadResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "You are not signed in as staff." };
  try {
    const record = await insertRecord(formData);
    return {
      ok: true,
      id: record.id,
      contractorId: record.contractorId,
      type: record.type,
      redirectTo: destinationAfterCreate(record.contractorId, record.type, backToProfile),
    };
  } catch (error) {
    console.error("Failed to create compliance record (with upload):", error);
    return { ok: false, error: "Failed to create compliance record. Please try again." };
  }
}

/**
 * Create-with-attachment, step 3 of 3. POST /api/documents treats every upload
 * as needing review: it sets the matching record to "Pending", replaces the
 * document name and overwrites the notes with an "uploaded by contractor" line.
 * On the create form the staff member has just chosen those values themselves,
 * so put them back, and point this record at the file that was just stored.
 */
export async function reapplyRecordAfterUpload(
  recordId: string,
  documentId: string,
  fields: { status: string; notes: string; documentName: string }
): Promise<{ ok: boolean }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false };
  try {
    const [record, document] = await Promise.all([
      prisma.complianceRecord.findUnique({ where: { id: recordId }, select: { contractorId: true } }),
      prisma.document.findUnique({
        where: { id: documentId },
        select: { contractorId: true, storageKey: true, fileName: true },
      }),
    ]);
    // Only ever link a file that belongs to the same person as the record.
    if (!record || !document || document.contractorId !== record.contractorId) return { ok: false };

    await prisma.complianceRecord.update({
      where: { id: recordId },
      data: {
        status: fields.status,
        notes: fields.notes,
        documentName: fields.documentName.trim() || document.fileName,
        filePath: document.storageKey,
      },
    });
    revalidatePath("/compliance");
    revalidatePath(`/compliance/${recordId}`);
    revalidatePath(`/contractors/${record.contractorId}`);
    return { ok: true };
  } catch (error) {
    console.error("Failed to re-apply compliance record after upload:", error);
    return { ok: false };
  }
}

export async function updateComplianceRecord(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const contractorId = formData.get("contractorId") as string;
    const type = formData.get("type") as string;
    const documentName = formData.get("documentName") as string;
    const reference = formData.get("reference") as string;
    const issueDateRaw = formData.get("issueDate") as string;
    const expiryDateRaw = formData.get("expiryDate") as string;
    const status = formData.get("status") as string;
    const notes = formData.get("notes") as string;

    const before = await prisma.complianceRecord.findUnique({ where: { id }, select: { status: true } });
    await prisma.complianceRecord.update({
      where: { id },
      data: {
        contractorId,
        type,
        documentName,
        reference,
        issueDate: issueDateRaw ? new Date(issueDateRaw) : null,
        expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
        status,
        notes,
      },
    });

    await logActivity(
      "Document record edited",
      "Contractor",
      contractorId,
      `${type}${before && before.status !== status ? ` (${before.status} → ${status})` : ""}`
    );

    revalidatePath(`/compliance/${id}`);
    redirect(`/compliance/${id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update compliance record:", error);
    throw new Error("Failed to update compliance record. Please try again.");
  }
}

export async function deleteComplianceRecord(id: string) {
  // Staff only: a bare session check also admitted logged-in contractors.
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");
  try {
    const deleted = await prisma.complianceRecord.delete({
      where: { id },
    });
    await logActivity(
      "Deleted Compliance Record",
      "Contractor",
      deleted.contractorId,
      JSON.stringify({ item: `${deleted.type} record`, from: "compliance page" })
    );

    revalidatePath("/compliance");
    redirect("/compliance");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete compliance record:", error);
    throw new Error("Failed to delete compliance record. Please try again.");
  }
}
