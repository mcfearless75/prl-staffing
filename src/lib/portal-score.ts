// The percentage a worker sees on My Documents. It used to count only the
// cards for their role and leave Right to Work out (RTW has its own section),
// so a worker with a CSCS and no Right to Work saw 100% and thought they were
// done (Adam McGuire, 2026-10-07). Right to Work now always counts as one
// item: it applies to everyone, whatever their role.

/** Where one checklist item stands. */
export type ItemState = "missing" | "submitted" | "verified";

export function documentsScore(input: { rtw: ItemState; cards: ItemState[] }): {
  total: number;
  submitted: number;
  verified: number;
  /** Verified items as a whole-number percentage. */
  score: number;
} {
  const items = [input.rtw, ...input.cards];
  const total = items.length;
  const verified = items.filter((s) => s === "verified").length;
  const submitted = items.filter((s) => s !== "missing").length;
  return { total, submitted, verified, score: Math.round((verified / total) * 100) };
}

/**
 * Right to Work's state from the RTW section's own progress check: "submitted"
 * once every document for their route is in (and the share code, where the
 * route needs one), "verified" once the office has verified those documents.
 */
export function rtwItemState(submittedComplete: boolean, verifiedComplete: boolean): ItemState {
  if (verifiedComplete) return "verified";
  return submittedComplete ? "submitted" : "missing";
}
