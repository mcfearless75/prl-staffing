"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";

export type JobRoleFormState = { error?: string };

function isUniqueNameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002" &&
    !!(error as { meta?: { target?: string[] } }).meta?.target?.includes("name")
  );
}

export async function createJobRole(
  _prevState: JobRoleFormState,
  formData: FormData
): Promise<JobRoleFormState> {
  const staff = await requireStaff();
  if (!staff.ok) redirect("/login");

  const name = (formData.get("name") as string || "").trim();
  if (!name) return { error: "Role name is required." };

  try {
    await prisma.jobRole.create({ data: { name } });
    revalidatePath("/job-roles");
    redirect("/job-roles");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    if (isUniqueNameError(error)) {
      return { error: "A job role with this name already exists." };
    }
    console.error("Failed to create job role:", error);
    return { error: "Failed to create job role. Please try again." };
  }
}

export async function updateJobRole(
  id: string,
  _prevState: JobRoleFormState,
  formData: FormData
): Promise<JobRoleFormState> {
  const staff = await requireStaff();
  if (!staff.ok) redirect("/login");

  const name = (formData.get("name") as string || "").trim();
  if (!name) return { error: "Role name is required." };
  const active = formData.get("active") === "on";

  try {
    // Archiving sets active:false — rows may still be referenced by
    // ContractorJobRole, so this never hard-deletes a JobRole.
    await prisma.jobRole.update({ where: { id }, data: { name, active } });
    revalidatePath("/job-roles");
    redirect("/job-roles");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    if (isUniqueNameError(error)) {
      return { error: "A job role with this name already exists." };
    }
    console.error("Failed to update job role:", error);
    return { error: "Failed to update job role. Please try again." };
  }
}
