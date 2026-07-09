"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function createSite(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = formData.get("name") as string;
  const address = formData.get("address") as string | null;
  const city = formData.get("city") as string | null;
  const postcode = formData.get("postcode") as string | null;

  if (!name?.trim()) throw new Error("Site name is required");

  await prisma.site.create({
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      postcode: postcode?.trim() || null,
      companyId,
    },
  });

  revalidatePath(`/companies/${companyId}`);
}

export type DeleteResult = { type: "ok" | "error"; message: string } | null;

export async function deleteSite(
  siteId: string,
  companyId: string,
  _prevState: DeleteResult,
  _formData: FormData
): Promise<DeleteResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Safety: refuse the delete outright if departments or assignments still
  // reference this site — neither is cascade-deleted here, so attempting
  // the delete would just throw a raw FK constraint error (P2003). Returned
  // (not thrown) so the specific reason reaches the user.
  const [departmentCount, assignmentCount] = await Promise.all([
    prisma.department.count({ where: { siteId } }),
    prisma.assignment.count({ where: { siteId } }),
  ]);

  if (departmentCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — ${departmentCount} department${departmentCount === 1 ? "" : "s"} exist for this site. Remove them first.`,
    };
  }
  if (assignmentCount > 0) {
    return {
      type: "error",
      message: `Cannot delete — ${assignmentCount} assignment${assignmentCount === 1 ? "" : "s"} are linked to this site. Reassign or remove them first.`,
    };
  }

  try {
    await prisma.site.delete({ where: { id: siteId } });
  } catch (error) {
    console.error("Failed to delete site:", error);
    return { type: "error", message: "Failed to delete site. Please try again." };
  }

  revalidatePath(`/companies/${companyId}`);
  return { type: "ok", message: "Site deleted." };
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function createDepartment(
  siteId: string,
  companyId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = formData.get("name") as string;

  if (!name?.trim()) throw new Error("Department name is required");

  await prisma.department.create({
    data: { name: name.trim(), siteId },
  });

  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

export async function deleteDepartment(
  deptId: string,
  siteId: string,
  companyId: string
) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.department.delete({ where: { id: deptId } });
  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

// ── End an assignment (mark Completed, set end date to today) ─────────────────

export async function endAssignment(
  assignmentId: string,
  companyId: string,
  siteId: string
) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: "Completed", endDate: new Date() },
  });
  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

export async function endAssignmentById(assignmentId: string, companyId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: "Completed", endDate: new Date() },
  });
  revalidatePath(`/companies/${companyId}`);
}

export async function assignToDepartment(
  assignmentId: string,
  siteId: string,
  companyId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const deptId = formData.get("deptId") as string;
  if (!deptId) return;
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { departmentId: deptId },
  });
  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

type MoveResult = { type: "ok" | "error"; message: string } | null;

export async function updateAssignmentSiteDept(
  _prevState: MoveResult,
  formData: FormData
): Promise<MoveResult> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const assignmentId = formData.get("assignmentId") as string;
  const siteId = (formData.get("siteId") as string) || null;
  const departmentId = (formData.get("departmentId") as string) || null;
  const companyId = formData.get("companyId") as string;

  if (!assignmentId || !siteId) {
    return { type: "error", message: "Please select a site." };
  }

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { siteId, departmentId: departmentId || null },
  });

  revalidatePath(`/companies/${companyId}`);
  return { type: "ok", message: "Moved." };
}

export async function updateSite(siteId: string, companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const postcode = formData.get("postcode") as string;

  if (!name?.trim()) throw new Error("Site name is required");

  await prisma.site.update({
    where: { id: siteId },
    data: {
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      postcode: postcode?.trim() || null,
    },
  });

  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}/sites/${siteId}`);
}

// ── Quick-assign contractor to a department ────────────────────────────────────

type AssignResult = { type: "ok" | "moved" | "error"; message: string } | null;

export async function quickAssignContractor(
  _prevState: AssignResult,
  formData: FormData
): Promise<AssignResult> {
  const companyId = formData.get("companyId") as string;
  const siteId = (formData.get("siteId") as string) || null;
  const deptId = (formData.get("deptId") as string) || null;
  const contractorId = formData.get("contractorId") as string;
  const role = formData.get("role") as string;
  const startDateRaw = formData.get("startDate") as string;
  const status = (formData.get("status") as string) || "Active";

  if (!contractorId || !role?.trim() || !startDateRaw) {
    return { type: "error", message: "Contractor, role and start date are required." };
  }

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
    await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        siteId: siteId ?? existing.siteId,
        departmentId: deptId ?? existing.departmentId,
        role: role.trim() || existing.role,
        startDate: new Date(startDateRaw),
        status,
      },
    });
    revalidatePath(`/companies/${companyId}/sites/${siteId ?? ""}`);
    revalidatePath(`/companies/${companyId}`);
    return { type: "moved", message: "Existing assignment updated to this site and department." };
  }

  await prisma.assignment.create({
    data: {
      contractorId,
      companyId,
      siteId,
      departmentId: deptId,
      role: role.trim(),
      startDate: new Date(startDateRaw),
      status,
    },
  });

  revalidatePath(`/companies/${companyId}/sites/${siteId ?? ""}`);
  revalidatePath(`/companies/${companyId}`);
  return { type: "ok", message: "Assigned successfully." };
}
