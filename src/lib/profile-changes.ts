/**
 * What a staff edit actually changed, for the profile's Activity tab
 * (Erica, 2026-10-01: "all entries of what's been done on the profile and by
 * who").
 *
 * Names the fields, not their values: the edit form holds NI number, date of
 * birth and medical notes, and the activity log is visible to every staff
 * user. Status is the exception — "Active → Inactive" is the whole point.
 */

export const PROFILE_FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  knownAs: "Known as",
  title: "Title",
  pronouns: "Pronouns",
  nationality: "Nationality",
  email: "Email",
  personalEmail: "Personal email",
  phone: "Phone",
  jobTitle: "Job title",
  dayRate: "Day rate",
  payRate: "Pay rate",
  chargeRate: "Charge rate",
  status: "Status",
  supplierId: "Supplier",
  niNumber: "NI number",
  utrNumber: "UTR number",
  ir35Status: "IR35 status",
  notes: "Notes",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  emergencyContactRelation: "Emergency contact relation",
  dateOfBirth: "Date of birth",
  leavingDate: "Leaving date",
  address: "Address",
  postcode: "Postcode",
  nextOfKin: "Next of kin",
  medicalNotes: "Medical notes",
};

/** Blank, null and undefined are the same "nothing"; dates compare by day. */
function norm(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  return String(v).trim();
}

/**
 * "Phone, Address, Status (Active → Inactive)", or "" when nothing changed.
 * Fields absent from `after` (undefined) were not submitted, so are skipped.
 */
export function describeProfileChanges(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, label] of Object.entries(PROFILE_FIELD_LABELS)) {
    if (!(key in after) || after[key] === undefined) continue;
    const a = norm(before[key]);
    const b = norm(after[key]);
    if (a === b) continue;
    parts.push(key === "status" ? `${label} (${a || "none"} → ${b})` : label);
  }
  return parts.join(", ");
}
