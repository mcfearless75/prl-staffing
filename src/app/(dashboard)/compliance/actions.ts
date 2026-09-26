"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

export async function createComplianceRecord(formData: FormData) {
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

    await prisma.complianceRecord.create({
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

    revalidatePath("/compliance");
    redirect("/compliance");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create compliance record:", error);
    throw new Error("Failed to create compliance record. Please try again.");
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
