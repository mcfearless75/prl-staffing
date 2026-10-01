"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { nameSearchClauses } from "@/lib/contractor-name";
import { requireStaff } from "@/lib/require-staff";
import { parseRemovalReason, type ItemTarget } from "@/lib/document-removal";
import { moveComplianceItem, removeComplianceItem } from "@/lib/document-ops";

export type ItemActionResult = { type: "ok" | "error"; message: string };

function parseTarget(target: unknown): ItemTarget | null {
  if (!target || typeof target !== "object") return null;
  const { kind, id } = target as { kind?: unknown; id?: unknown };
  if ((kind !== "document" && kind !== "record") || typeof id !== "string" || !id) return null;
  return { kind, id };
}

export async function removeItemAction(
  contractorId: string,
  target: ItemTarget,
  reason: string,
  detail: string
): Promise<ItemActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can remove documents." };

  const t = parseTarget(target);
  const why = parseRemovalReason(reason, detail);
  if (!t) return { type: "error", message: "Nothing selected." };
  if (!why) return { type: "error", message: "Choose a reason (and describe it if Other)." };

  try {
    const result = await removeComplianceItem(contractorId, t, why);
    if (!result.ok) return { type: "error", message: result.error };
    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: result.message };
  } catch (err) {
    console.error("[document-actions] remove failed:", err);
    return { type: "error", message: "Could not remove it. Please try again." };
  }
}

export async function moveItemAction(
  contractorId: string,
  target: ItemTarget,
  toContractorId: string,
  reason: string,
  detail: string
): Promise<ItemActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) return { type: "error", message: "Only staff can move documents." };

  const t = parseTarget(target);
  const why = parseRemovalReason(reason, detail);
  if (!t) return { type: "error", message: "Nothing selected." };
  if (typeof toContractorId !== "string" || !toContractorId) {
    return { type: "error", message: "Pick the contractor it belongs to." };
  }
  if (!why) return { type: "error", message: "Choose a reason (and describe it if Other)." };

  try {
    const result = await moveComplianceItem(contractorId, t, toContractorId, why);
    if (!result.ok) return { type: "error", message: result.error };
    revalidatePath(`/contractors/${contractorId}`);
    revalidatePath(`/contractors/${toContractorId}`);
    return { type: "ok", message: result.message };
  } catch (err) {
    console.error("[document-actions] move failed:", err);
    return { type: "error", message: "Could not move it. Please try again." };
  }
}

export type MoveCandidate = { id: string; name: string; ref: string | null; jobTitle: string | null };

/** Contractor picker for Move. Staff only; at most 8 matches. */
export async function searchMoveCandidates(query: string, excludeId: string): Promise<MoveCandidate[]> {
  const guard = await requireStaff();
  if (!guard.ok) return [];
  const q = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (q.length < 2) return [];

  const rows = await prisma.contractor.findMany({
    where: {
      id: { not: excludeId },
      AND: nameSearchClauses(q, ["firstName", "lastName", "knownAs", "ref", "email"]),
    },
    select: { id: true, firstName: true, lastName: true, ref: true, jobTitle: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 8,
  });
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`,
    ref: r.ref,
    jobTitle: r.jobTitle,
  }));
}
