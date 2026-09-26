// One place that decides how a contractor's name is shown and how they're
// greeted, so "known as" can't be honoured on one screen and ignored on the next.

type NameParts = {
  firstName?: string | null;
  lastName?: string | null;
  knownAs?: string | null;
};

function clean(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/**
 * The known-as name, but only when it adds something. "Robert" known as
 * "robert" is not a nickname, and showing it would just be noise.
 */
export function effectiveKnownAs(c: NameParts): string | null {
  const known = clean(c.knownAs);
  if (!known) return null;
  if (known.toLowerCase() === clean(c.firstName).toLowerCase()) return null;
  return known;
}

/** Who an email says "Hi" to: known-as, else first name, else `fallback`. */
export function greetingName(c: NameParts, fallback = "there"): string {
  return effectiveKnownAs(c) ?? (clean(c.firstName) || fallback);
}

/** Legal name as recorded — "Robert Smith". Known-as is shown separately. */
export function fullName(c: NameParts): string {
  return [clean(c.firstName), clean(c.lastName)].filter(Boolean).join(" ");
}

/** Normalise form input: blank or same-as-first-name is stored as null. */
export function normaliseKnownAs(raw: unknown, firstName: string): string | null {
  if (typeof raw !== "string") return null;
  const known = raw.trim().slice(0, 60);
  return effectiveKnownAs({ firstName, knownAs: known });
}
