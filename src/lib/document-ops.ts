// Executes the plans from document-removal.ts. Not a "use server" module on
// purpose: these functions do no auth check, so they must only be reachable
// through actions that call requireStaff() first.

import { prisma } from "@/lib/db";
import { deleteFromR2 } from "@/lib/r2";
import { logActivity } from "@/lib/activity-log";
import { planMove, planRemoval, type ItemTarget } from "@/lib/document-removal";

type OpResult = { ok: true; message: string } | { ok: false; error: string };

async function loadItems(contractorId: string) {
  const [records, documents] = await Promise.all([
    prisma.complianceRecord.findMany({
      where: { contractorId },
      select: { id: true, type: true, status: true, filePath: true },
    }),
    prisma.document.findMany({
      where: { contractorId },
      select: { id: true, type: true, fileName: true, storageKey: true },
    }),
  ]);
  return { records, documents };
}

/** What the audit trail says was affected: types and file names, never contents. */
function describe(
  target: ItemTarget,
  records: Array<{ id: string; type: string }>,
  documents: Array<{ id: string; type: string; fileName: string }>
): string {
  if (target.kind === "document") {
    const d = documents.find((x) => x.id === target.id);
    return d ? `${d.type} file "${d.fileName}"` : "file";
  }
  const r = records.find((x) => x.id === target.id);
  return r ? `${r.type} record` : "record";
}

export async function removeComplianceItem(
  contractorId: string,
  target: ItemTarget,
  reason: string
): Promise<OpResult> {
  const { records, documents } = await loadItems(contractorId);
  const plan = planRemoval(target, records, documents);
  if (!plan) return { ok: false, error: "That item isn't on this contractor's profile." };
  const what = describe(target, records, documents);

  await prisma.$transaction([
    prisma.document.deleteMany({ where: { id: { in: plan.deleteDocumentIds }, contractorId } }),
    prisma.complianceRecord.deleteMany({ where: { id: { in: plan.deleteRecordIds }, contractorId } }),
    prisma.complianceRecord.updateMany({
      where: { id: { in: plan.unlinkRecordIds }, contractorId },
      data: { filePath: null },
    }),
  ]);

  // After the commit: a failed R2 delete leaves an unreachable object (no row
  // points at it any more), which is recoverable; the reverse order could
  // leave rows pointing at a file that no longer exists.
  const r2Failures: string[] = [];
  for (const key of plan.r2Keys) {
    try {
      await deleteFromR2(key);
    } catch (err) {
      console.error(`[document-ops] R2 delete failed for ${key}:`, err);
      r2Failures.push(key);
    }
  }

  await logActivity(
    "Removed Document",
    "Contractor",
    contractorId,
    JSON.stringify({
      item: what,
      reason,
      filesDeleted: plan.deleteDocumentIds.length,
      recordsDeleted: plan.deleteRecordIds.length,
      recordsUnlinked: plan.unlinkRecordIds.length,
      ...(r2Failures.length ? { storageDeleteFailed: r2Failures } : {}),
    })
  );

  return {
    ok: true,
    message: r2Failures.length
      ? `Removed ${what}. The stored file could not be deleted; it is no longer linked to anyone.`
      : `Removed ${what}.`,
  };
}

export async function moveComplianceItem(
  fromContractorId: string,
  target: ItemTarget,
  toContractorId: string,
  reason: string
): Promise<OpResult> {
  if (fromContractorId === toContractorId) return { ok: false, error: "Pick a different contractor." };

  const to = await prisma.contractor.findUnique({
    where: { id: toContractorId },
    select: { id: true, firstName: true, lastName: true, ref: true },
  });
  if (!to) return { ok: false, error: "The contractor to move it to wasn't found." };
  const from = await prisma.contractor.findUnique({
    where: { id: fromContractorId },
    select: { firstName: true, lastName: true, ref: true },
  });
  if (!from) return { ok: false, error: "Contractor not found." };

  const { records, documents } = await loadItems(fromContractorId);
  const plan = planMove(target, records, documents);
  if (!plan) return { ok: false, error: "That item isn't on this contractor's profile." };
  const what = describe(target, records, documents);

  await prisma.$transaction([
    prisma.document.updateMany({
      where: { id: { in: plan.documentIds }, contractorId: fromContractorId },
      data: { contractorId: toContractorId },
    }),
    prisma.complianceRecord.updateMany({
      where: { id: { in: plan.recordIds }, contractorId: fromContractorId },
      data: { contractorId: toContractorId },
    }),
  ]);

  const label = (c: { firstName: string; lastName: string; ref: string | null }) =>
    `${c.firstName} ${c.lastName}${c.ref ? ` (${c.ref})` : ""}`;
  const detail = { item: what, reason, files: plan.documentIds.length, records: plan.recordIds.length };
  await logActivity(
    "Moved Document Out",
    "Contractor",
    fromContractorId,
    JSON.stringify({ ...detail, to: label(to) })
  );
  await logActivity(
    "Moved Document In",
    "Contractor",
    toContractorId,
    JSON.stringify({ ...detail, from: label(from) })
  );

  return { ok: true, message: `Moved ${what} to ${label(to)}.` };
}
