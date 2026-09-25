/**
 * Emergency-contact completeness. Pure — no Prisma — so the rule is testable.
 *
 * A contact is usable only with both a name and a phone number; the
 * relationship is nice to have and is not reported as missing.
 * Whitespace-only values count as missing.
 */

export interface EmergencyContactFields {
  emergencyContactName: string | null | undefined;
  emergencyContactPhone: string | null | undefined;
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim() === "";
}

/** Labels of the missing fields, in display order. Empty when complete. */
export function missingEmergencyFields(c: EmergencyContactFields): string[] {
  const missing: string[] = [];
  if (isBlank(c.emergencyContactName)) missing.push("Name");
  if (isBlank(c.emergencyContactPhone)) missing.push("Phone");
  return missing;
}
