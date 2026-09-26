// What the worker must fill in before the App Invite Form counts as submitted,
// and when a name edit needs staff to check it against ID.

export const REQUIRED_PROFILE_FIELDS = [
  { key: "title", label: "Title" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "pronouns", label: "Pronouns" },
  { key: "nationality", label: "Nationality" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "postcode", label: "Postcode" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "niNumber", label: "NI number" },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhone", label: "Emergency contact phone" },
  { key: "emergencyContactRelation", label: "Emergency contact relationship" },
] as const;

export type ProfileFieldKey = (typeof REQUIRED_PROFILE_FIELDS)[number]["key"];
export type ProfileValues = Partial<Record<ProfileFieldKey, string | null | undefined>>;

/**
 * Labels of required fields still blank, in form order — shown to the worker
 * as "Still needed: …". "Known as" is deliberately not here: most people have
 * no nickname, and forcing one would just get their first name typed twice.
 */
export function missingProfileFields(values: ProfileValues): string[] {
  return REQUIRED_PROFILE_FIELDS.filter((f) => !String(values[f.key] ?? "").trim()).map((f) => f.label);
}

type Name = { firstName?: string | null; lastName?: string | null };

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

/**
 * Whether a worker's edit changed their legal name. Whitespace-only edits don't
 * count; any other difference — including capitalisation, since that is what a
 * spelling fix often is — does, and staff check it against ID.
 */
export function nameChange(before: Name, after: Name): { changed: boolean; from: string } {
  const from = `${norm(before.firstName)} ${norm(before.lastName)}`.trim();
  const to = `${norm(after.firstName)} ${norm(after.lastName)}`.trim();
  return { changed: from !== to, from };
}
