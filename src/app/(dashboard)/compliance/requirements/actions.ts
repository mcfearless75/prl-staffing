"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isValidComplianceType } from "@/lib/compliance-types";
import { normaliseRole } from "@/lib/role-normalisation";

/**
 * Requirements are stored against the CANONICAL role name so they match what
 * the resolver produces at read time. Saving a raw variant like "Joiner Nights"
 * would create a rule that never fires.
 */
function canonicaliseRoleInput(raw: string): string {
  if (raw === "All") return "All";
  const { canonical } = normaliseRole(raw);
  return canonical ?? raw.trim();
}

export async function createRequirement(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = canonicaliseRoleInput((formData.get("role") as string) ?? "");
  const companyId = (formData.get("companyId") as string) || null;
  const description = ((formData.get("description") as string) || "").trim() || null;
  const isMandatory = formData.get("isMandatory") !== "false";

  // The form posts a checkbox group, so one submit can configure a whole
  // role checklist rather than forcing one round-trip per document.
  const types = formData
    .getAll("types")
    .map((t) => String(t).trim())
    .filter(Boolean)
    .filter(isValidComplianceType);

  if (!role || types.length === 0) {
    redirect("/compliance/requirements/new?error=missing");
  }

  // createMany + skipDuplicates so re-adding an existing type is a no-op rather
  // than a unique-constraint 500 on [role, companyId, type].
  await prisma.complianceRequirement.createMany({
    data: types.map((type) => ({ role, companyId, type, description, isMandatory })),
    skipDuplicates: true,
  });

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
  redirect("/compliance/requirements");
}

export async function updateRequirement(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const description = ((formData.get("description") as string) || "").trim() || null;
  const isMandatory = formData.get("isMandatory") !== "false";

  await prisma.complianceRequirement.update({
    where: { id },
    data: { description, isMandatory },
  });

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

export async function toggleMandatory(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const existing = await prisma.complianceRequirement.findUnique({ where: { id } });
  if (!existing) return;

  await prisma.complianceRequirement.update({
    where: { id },
    data: { isMandatory: !existing.isMandatory },
  });

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

export async function deleteRequirement(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await prisma.complianceRequirement.delete({ where: { id } });

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

/** Removes every requirement configured for one role, for undoing a bad setup. */
export async function deleteRoleRequirements(role: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await prisma.complianceRequirement.deleteMany({ where: { role } });

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}
