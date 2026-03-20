"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRequirement(formData: FormData) {
  const role = formData.get("role") as string;
  const companyId = (formData.get("companyId") as string) || null;
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string) || null;
  const isMandatory = formData.get("isMandatory") === "true";

  await prisma.complianceRequirement.create({
    data: {
      role,
      companyId,
      type,
      description,
      isMandatory,
    },
  });

  redirect("/compliance/requirements");
}

export async function deleteRequirement(id: string) {
  await prisma.complianceRequirement.delete({
    where: { id },
  });

  revalidatePath("/compliance/requirements");
  redirect("/compliance/requirements");
}
