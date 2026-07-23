"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

function isNextRedirect(error: unknown): boolean {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") return true;
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = (error as { digest?: unknown }).digest;
    return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
  }
  return false;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const code = (formData.get("code") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const companyId = (formData.get("companyId") as string) || null;
    const siteAddress = (formData.get("siteAddress") as string)?.trim() || null;
    const costCode = (formData.get("costCode") as string)?.trim() || null;
    const status = (formData.get("status") as string) || "Active";
    const notes = (formData.get("notes") as string)?.trim() || null;

    await prisma.project.create({
      data: {
        code,
        name,
        companyId: companyId || null,
        siteAddress,
        costCode,
        status,
        notes,
      },
    });

    revalidatePath("/projects");
    redirect("/projects");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (isUniqueConstraintError(error)) {
      throw new Error("A project with this code already exists.");
    }
    console.error("Failed to create project:", error);
    throw new Error("Failed to create project. Please try again.");
  }
}

export async function updateProject(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    const code = (formData.get("code") as string)?.trim();
    const name = (formData.get("name") as string)?.trim();
    const companyId = (formData.get("companyId") as string) || null;
    const siteAddress = (formData.get("siteAddress") as string)?.trim() || null;
    const costCode = (formData.get("costCode") as string)?.trim() || null;
    const status = (formData.get("status") as string) || "Active";
    const notes = (formData.get("notes") as string)?.trim() || null;

    await prisma.project.update({
      where: { id },
      data: {
        code,
        name,
        companyId: companyId || null,
        siteAddress,
        costCode,
        status,
        notes,
      },
    });

    revalidatePath(`/projects/${id}`);
    redirect(`/projects/${id}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    if (isUniqueConstraintError(error)) {
      throw new Error("A project with this code already exists.");
    }
    console.error("Failed to update project:", error);
    throw new Error("Failed to update project. Please try again.");
  }
}

export type DeleteResult = { type: "ok" | "error"; message: string } | null;

export async function deleteProject(
  id: string,
  _prevState: DeleteResult,
  _formData: FormData
): Promise<DeleteResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Safety: refuse the delete outright if assignments still reference this
  // project — same guard pattern used for companies (invoices/requirements)
  // so the specific reason reaches the user instead of a raw FK error.
  const assignmentCount = await prisma.assignment.count({ where: { projectId: id } });
  if (assignmentCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — ${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"} linked to this project. Remove or reassign them first.`,
    };
  }

  try {
    await prisma.project.delete({ where: { id } });
    revalidatePath("/projects");
    redirect("/projects");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    console.error("Failed to delete project:", error);
    return { type: "error", message: "Failed to delete project. Please try again." };
  }
}
