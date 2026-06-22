"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Sites ─────────────────────────────────────────────────────────────────────

export async function createSite(companyId: string, formData: FormData) {
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

export async function deleteSite(siteId: string, companyId: string) {
  await prisma.site.delete({ where: { id: siteId } });
  revalidatePath(`/companies/${companyId}`);
}

// ── Departments ───────────────────────────────────────────────────────────────

export async function createDepartment(
  siteId: string,
  companyId: string,
  formData: FormData
) {
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
  await prisma.department.delete({ where: { id: deptId } });
  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

// ── End an assignment (mark Completed, set end date to today) ─────────────────

export async function endAssignment(
  assignmentId: string,
  companyId: string,
  siteId: string
) {
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: "Completed", endDate: new Date() },
  });
  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}

// ── Quick-assign contractor to a department ────────────────────────────────────

export async function quickAssignContractor(
  companyId: string,
  siteId: string,
  deptId: string,
  formData: FormData
) {
  const contractorId = formData.get("contractorId") as string;
  const role = formData.get("role") as string;
  const startDateRaw = formData.get("startDate") as string;

  if (!contractorId || !role?.trim() || !startDateRaw) {
    throw new Error("Contractor, role and start date are required");
  }

  const existing = await prisma.assignment.findFirst({
    where: { contractorId, companyId, status: "Active" },
  });

  if (existing) {
    await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        siteId,
        departmentId: deptId,
        role: role.trim() || existing.role,
        startDate: new Date(startDateRaw),
      },
    });
  } else {
    await prisma.assignment.create({
      data: {
        contractorId,
        companyId,
        siteId,
        departmentId: deptId,
        role: role.trim(),
        startDate: new Date(startDateRaw),
        status: "Active",
      },
    });
  }

  revalidatePath(`/companies/${companyId}/sites/${siteId}`);
}
