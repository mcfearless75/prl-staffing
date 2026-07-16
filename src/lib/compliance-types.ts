// Canonical compliance document types. Single source of truth used by the
// compliance dashboard, the inline type selector, and the type-change API.
export const COMPLIANCE_TYPES = [
  "CV",
  "CSCS",
  "CCNSG",
  "NPORS",
  "Passport",
  "Share Code",
  "Right to Work",
  "DBS",
  "P45",
  "P60",
  "Insurance",
  "IR35 Assessment",
  "Qualification",
  "Other",
] as const;

export type ComplianceType = (typeof COMPLIANCE_TYPES)[number];
