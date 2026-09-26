import { COMPLIANCE_TYPE_GROUPS, categoryForType, type ComplianceCategory } from "@/lib/compliance-types";

/** Best guess at a document's type from its file name (e.g. a WhatsApp'd scan). */
export function guessDocType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes("passport")) return "Passport";
  if (name.includes("cscs")) return "CSCS";
  if (name.includes("ccnsg")) return "CCNSG";
  if (name.includes("npors")) return "NPORS";
  if (name.includes("sharecode") || name.includes("share code") || name.includes("share_code")) return "Share Code";
  if (name.includes("dbs")) return "DBS";
  if (/\bp45\b/.test(name)) return "P45";
  if (/\bp60\b/.test(name)) return "P60";
  if (name.includes("insurance")) return "Insurance";
  if (name.includes("qualification") || name.includes("nvq") || name.includes("cert")) return "Qualification";
  if (name.includes("rtw") || name.includes("right to work") || name.includes("visa")) return "Right to Work";
  if (name.includes("ir35")) return "IR35 Assessment";
  if (/\bcv\b/.test(name) || name.includes("resume")) return "CV";
  return "Other";
}

/** The type groups an uploader offers: all of them, or just one category's. */
export function typeGroupsFor(only?: ComplianceCategory) {
  return only ? COMPLIANCE_TYPE_GROUPS.filter((g) => g.category === only) : COMPLIANCE_TYPE_GROUPS;
}

/**
 * Guess, but never outside the uploader's category: on the Right to Work tab
 * "scan.pdf" (guessed "Other") or "cscs.jpg" becomes the category's generic
 * type, so nothing lands there as a CSCS card by accident.
 */
export function guessDocTypeWithin(fileName: string, only?: ComplianceCategory): string {
  const guess = guessDocType(fileName);
  if (!only || categoryForType(guess) === only) return guess;
  return typeGroupsFor(only)[0]?.types[0] ?? guess;
}
