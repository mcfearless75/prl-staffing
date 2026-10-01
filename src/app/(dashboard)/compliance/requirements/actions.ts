"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { categoryForType, isValidComplianceType } from "@/lib/compliance-types";
import { logActivity } from "@/lib/activity-log";
import { requirementLabel } from "@/lib/requirement-match";

/**
 * Requirement changes are written to the activity log (entity
 * "ComplianceRequirement"): on 2026-10-01 Right to Work was put into an
 * "any one" group with CSCS, quietly making it optional for most roles, and
 * there was no record of who had changed it.
 */
async function logRequirement(action: string, details: string, id?: string) {
  await logActivity(action, "ComplianceRequirement", id, details);
}

function describe(r: { role: string; type: string; alternatives?: string[] | null; isMandatory: boolean; companyId?: string | null }) {
  return `${r.role === "All" ? "All roles" : r.role}: ${requirementLabel(r)}${r.isMandatory ? "" : " (optional)"}${r.companyId ? " [one client]" : ""}`;
}
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

  // "Any one of these will do" (Jenni, 2026-10-01: "it could be either NPORS
  // or CSCS"): ONE requirement met by any of the ticked types, stored as the
  // first type plus alternatives. Otherwise one requirement per type, all needed.
  const anyOne = formData.get("anyOne") === "on" && types.length > 1;

  // Right to Work is a legal requirement for everyone — never one of several
  // alternatives. "Right to Work OR CSCS" let a CSCS card stand in for it.
  if (anyOne && types.some((t) => categoryForType(t) === "Right to Work")) {
    redirect(`/compliance/requirements/new?error=rtw-any&role=${encodeURIComponent(role)}`);
  }

  // createMany + skipDuplicates so re-adding an existing type is a no-op rather
  // than a unique-constraint 500 on [role, companyId, type].
  await prisma.complianceRequirement.createMany({
    data: anyOne
      ? [{ role, companyId, type: types[0], alternatives: types.slice(1), description, isMandatory }]
      : types.map((type) => ({ role, companyId, type, description, isMandatory })),
    skipDuplicates: true,
  });
  await logRequirement(
    "Compliance requirement added",
    anyOne
      ? describe({ role, companyId, type: types[0], alternatives: types.slice(1), isMandatory })
      : types.map((type) => describe({ role, companyId, type, isMandatory })).join("; ")
  );

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
  redirect("/compliance/requirements");
}

export async function updateRequirement(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const description = ((formData.get("description") as string) || "").trim() || null;
  const isMandatory = formData.get("isMandatory") !== "false";

  const updated = await prisma.complianceRequirement.update({
    where: { id },
    data: { description, isMandatory },
  });
  await logRequirement("Compliance requirement edited", describe(updated), id);

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

export async function toggleMandatory(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const existing = await prisma.complianceRequirement.findUnique({ where: { id } });
  if (!existing) return;

  const toggled = await prisma.complianceRequirement.update({
    where: { id },
    data: { isMandatory: !existing.isMandatory },
  });
  await logRequirement(
    "Compliance requirement edited",
    `${describe(toggled)} — now ${toggled.isMandatory ? "mandatory" : "optional"}`,
    id
  );

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

export async function deleteRequirement(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const removed = await prisma.complianceRequirement.delete({ where: { id } });
  await logRequirement("Compliance requirement removed", describe(removed), id);

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}

/** Removes every requirement configured for one role, for undoing a bad setup. */
export async function deleteRoleRequirements(role: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const removed = await prisma.complianceRequirement.findMany({ where: { role } });
  await prisma.complianceRequirement.deleteMany({ where: { role } });
  if (removed.length) {
    await logRequirement("Compliance requirements removed (whole role)", removed.map(describe).join("; "));
  }

  revalidatePath("/compliance/requirements");
  revalidatePath("/compliance/gap-report");
}
