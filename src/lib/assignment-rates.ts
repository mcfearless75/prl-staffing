export interface AssignmentRateFields {
  chargeRate: number | null;
  payRate: number | null;
  rateBasis: string | null;
}

/**
 * Single source of truth for parsing an Assignment's rate fields off a FormData
 * submission. Both the main assignment form (assignments/actions.ts) and the
 * contractor-profile quick-assign form (contractors/actions.ts) write to the
 * same Assignment.chargeRate/payRate/rateBasis columns — previously each had
 * its own copy of this parsing, which could silently drift out of sync.
 */
export function parseAssignmentRateFields(formData: FormData): AssignmentRateFields {
  const chargeRateRaw = formData.get("chargeRate") as string;
  const payRateRaw = formData.get("payRate") as string;
  const rateBasis = (formData.get("rateBasis") as string) || null;

  return {
    chargeRate: chargeRateRaw ? parseFloat(chargeRateRaw) : null,
    payRate: payRateRaw ? parseFloat(payRateRaw) : null,
    rateBasis,
  };
}
