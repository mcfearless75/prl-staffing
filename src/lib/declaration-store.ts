// The ONLY code that reads, writes or erases SensitiveDeclaration rows.
// NO auth inside — callers check first (requireContractor for a worker's own
// answers, requireAdmin for anyone else's).

import { prisma } from "@/lib/db";
import { encryptJson, decryptJson } from "@/lib/sensitive-crypto";
import { declarationsComplete, type Declarations } from "@/lib/declarations";

export async function readDeclarations(contractorId: string): Promise<Declarations | null> {
  const row = await prisma.sensitiveDeclaration.findUnique({ where: { contractorId }, select: { payload: true } });
  return row ? decryptJson<Declarations>(row.payload) : null;
}

/** Replaces the portal answers; anything captured by /apply is kept alongside. */
export async function saveDeclarations(contractorId: string, answers: Declarations): Promise<{ complete: boolean }> {
  const existing = await readDeclarations(contractorId);
  const merged: Declarations = { ...answers, applyAnswers: existing?.applyAnswers };
  const complete = declarationsComplete(merged);
  const data = { payload: encryptJson(merged), completedAt: complete ? new Date() : null };
  await prisma.sensitiveDeclaration.upsert({
    where: { contractorId },
    create: { contractorId, ...data },
    update: data,
  });
  return { complete };
}

/** /apply's criminal-record answers, merged into whatever is already held. */
export async function saveApplyAnswers(
  contractorId: string,
  applyAnswers: NonNullable<Declarations["applyAnswers"]>
): Promise<void> {
  const existing = (await readDeclarations(contractorId)) ?? {};
  const merged: Declarations = { ...existing, applyAnswers };
  await prisma.sensitiveDeclaration.upsert({
    where: { contractorId },
    create: { contractorId, payload: encryptJson(merged), completedAt: null },
    update: { payload: encryptJson(merged) },
  });
}

export async function logSensitiveAccess(contractorId: string, action: string, actorEmail: string | null) {
  await prisma.sensitiveAccessLog.create({ data: { contractorId, action, actorEmail } });
}

export async function eraseDeclarations(contractorId: string, action: string, actorEmail: string | null): Promise<boolean> {
  const { count } = await prisma.sensitiveDeclaration.deleteMany({ where: { contractorId } });
  if (count > 0) await logSensitiveAccess(contractorId, action, actorEmail);
  return count > 0;
}
