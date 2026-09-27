"use server";

import { requireAdmin } from "@/lib/require-staff";
import { canViewSensitive, sensitiveStorageAvailable } from "@/lib/sensitive-crypto";
import { logSensitiveAccess, readDeclarations } from "@/lib/declaration-store";
import { daTestBlocked, type Declarations } from "@/lib/declarations";

export type RevealResult =
  | { ok: true; answers: Declarations | null; daBlocked: boolean }
  | { ok: false; error: string };

/**
 * Decrypts one worker's Health & declarations for an allowed viewer. Logged
 * BEFORE the answers are returned, so a view can never go unrecorded.
 */
export async function revealDeclarationsAction(contractorId: string): Promise<RevealResult> {
  const guard = await requireAdmin();
  if (!guard.ok || !canViewSensitive(guard.session.user)) {
    return { ok: false, error: "Only named administrators can view health and criminal-record answers." };
  }
  if (!sensitiveStorageAvailable()) return { ok: false, error: "Secure storage isn't configured yet." };

  await logSensitiveAccess(contractorId, "view", guard.session.user.email ?? null);
  const answers = await readDeclarations(contractorId);
  return { ok: true, answers, daBlocked: answers ? daTestBlocked(answers) : false };
}
