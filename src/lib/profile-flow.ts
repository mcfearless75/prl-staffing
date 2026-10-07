// The worker's first-login profile is one flow (Paul, 2026-10-07): details,
// health & declarations, the 48-hour waiver and references, with a single
// "Submit and continue" at the bottom that then takes them to upload
// documents. The Submit button used to sit after the emergency contact, so
// people pressed it, thought they were done, and never answered the rest.
// Pure: the page uses it before saving anything, and tests pin it.

import { missingProfileFields, type ProfileValues } from "@/lib/profile-completion";
import { missingDeclarations, normaliseDeclarations } from "@/lib/declarations";

export type WaiverState = {
  /** A choice is already on file, so signing again is optional. */
  signedBefore: boolean;
  decision: string;
  signature: string;
};

/**
 * Everything still unanswered across the whole profile, in page order. A
 * section passed as null isn't shown to this worker (e.g. declarations when
 * secure storage isn't configured), so it can't hold them up.
 */
export function missingForSubmit(input: {
  profile: ProfileValues;
  declarations: Record<string, unknown> | null;
  waiver: WaiverState | null;
}): string[] {
  const missing = [...missingProfileFields(input.profile)];
  if (input.declarations) missing.push(...missingDeclarations(normaliseDeclarations(input.declarations)));
  if (input.waiver && !input.waiver.signedBefore) {
    if (!input.waiver.decision) missing.push("48 Hour Waiver choice");
    if (input.waiver.signature.trim().length < 3) missing.push("48 Hour Waiver signature");
  }
  return missing;
}
