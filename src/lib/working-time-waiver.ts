/**
 * 48-hour waiver (Working Time Regulations 1998, reg. 5 opt-out), signed by
 * the worker in the app. Moved off the public /apply form on 2026-10-06.
 *
 * Stored on Contractor.waiverDecision / waiverSignature / waiverSignedAt.
 * The worker can change it at any time by signing again; the latest signature
 * is the one that stands.
 */

export const WAIVER_DECISIONS = ["opt-out", "no-opt-out"] as const;
export type WaiverDecision = (typeof WAIVER_DECISIONS)[number];

export const WAIVER_LABELS: Record<WaiverDecision, string> = {
  "opt-out": "I opt out of the 48-hour limit",
  "no-opt-out": "I do not wish to opt out",
};

/** Staff-facing wording of a stored decision. Unknown/legacy values shown as-is. */
export function waiverDecisionLabel(decision: string | null | undefined): string {
  if (!decision) return "Not signed";
  if (decision === "opt-out") return "Opted out of the 48-hour limit";
  if (decision === "no-opt-out") return "Did not opt out (48-hour limit applies)";
  return decision;
}

export const SIGNATURE_MAX = 120;

export type WaiverInput = { decision: WaiverDecision; signature: string };

/**
 * Validates the worker's submission. The signature is their typed full name;
 * it is not compared with the name on file, because people sign with the name
 * they use (known-as, double-barrelled, etc.) and a mismatch would block them.
 */
export function parseWaiver(raw: unknown): { ok: true; value: WaiverInput } | { ok: false; error: string } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const decision = body.decision;
  if (typeof decision !== "string" || !(WAIVER_DECISIONS as readonly string[]).includes(decision)) {
    return { ok: false, error: "Please choose whether you opt out of the 48-hour limit." };
  }
  const signature = typeof body.signature === "string" ? body.signature.replace(/\s+/g, " ").trim() : "";
  if (signature.length < 3 || !/\p{L}/u.test(signature)) {
    return { ok: false, error: "Please type your full name to sign." };
  }
  if (signature.length > SIGNATURE_MAX) {
    return { ok: false, error: `Your signature must be ${SIGNATURE_MAX} characters or fewer.` };
  }
  return { ok: true, value: { decision: decision as WaiverDecision, signature } };
}
