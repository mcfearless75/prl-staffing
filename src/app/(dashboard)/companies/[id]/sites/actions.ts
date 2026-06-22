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
