/**
 * Confirm Email exists to catch a mistyped address before it is saved. It only
 * has work to do when the address is new or being changed; demanding it on
 * every save meant editing just a job role needed the email retyped.
 * Shared by the form (show/hide the field) and the server action (the gate).
 */
const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/** `original` is the stored email, or null/undefined for a new contractor. */
export function needsEmailConfirmation(original: string | null | undefined, submitted: string): boolean {
  if (original == null) return true;
  return norm(original) !== norm(submitted);
}

/** Server-side gate. Returns an error message, or null when the save may go ahead. */
export function emailConfirmationError(
  original: string | null | undefined,
  email: string,
  confirmEmail: string
): string | null {
  if (!needsEmailConfirmation(original, email)) return null;
  if (norm(email) !== norm(confirmEmail)) {
    return "Email and Confirm Email do not match. Please re-check and try again.";
  }
  return null;
}
