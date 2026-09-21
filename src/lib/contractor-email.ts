/**
 * Looking a person up by email address, case-insensitively.
 *
 * `Contractor.email @unique` is a case-SENSITIVE index in Postgres, so
 * "Dannystuart12@..." and "dannystuart12@..." are two different keys. The book
 * genuinely contained pairs like that: people re-applied, the constraint did
 * not recognise them, and an empty second record appeared while they got no
 * portal access and no explanation.
 *
 * Every write path lower-cases before storing, so new rows are clean, and the
 * historic ones have been merged. That makes a plain equality lookup *almost*
 * always correct — which is exactly what makes it dangerous, because the one
 * time it is wrong, somebody silently cannot reset their password or set up
 * their account, and nothing errors.
 *
 * Use this for any lookup of a person BY an address a human typed.
 */

/**
 * A Prisma filter matching this address regardless of case.
 *
 *     where: { email: emailMatches(input) }
 *
 * Note that `findUnique` cannot take a filter object — a call site using it
 * has to move to `findFirst`. That is not a workaround; `email` only looks
 * unique here because the index ignores case differences that Postgres does
 * not.
 */
export function emailMatches(email: string) {
  return {
    equals: email.trim().toLowerCase(),
    mode: "insensitive" as const,
  };
}

/**
 * The canonical stored form of an address.
 *
 * Every write path should pass an address through this before storing it, so
 * the case-sensitive index behaves as though it were case-insensitive.
 */
export function normaliseStoredEmail(email: string): string {
  return email.trim().toLowerCase();
}
