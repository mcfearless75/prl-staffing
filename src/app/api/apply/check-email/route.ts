import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { normaliseEmail } from "@/lib/duplicate-check";

/**
 * "Is this applicant already in PRISM?" — asked by /apply as soon as the
 * applicant finishes typing their email, so they are told before filling in
 * eight sections of form that they already have a record.
 *
 * Exists because Contractor.email is unique: a duplicate email used to be
 * caught only at the very end, by a database constraint, after the applicant
 * had entered their passport, bank and next-of-kin details.
 *
 * DELIBERATELY NARROW. This is a public, unauthenticated endpoint, so any
 * answer it gives is an account-enumeration oracle — someone can learn whether
 * a given address works for PRL. That is accepted, because the alternative is
 * the applicant finding out only after completing the form, but it is why:
 *
 *   - the response is two booleans and nothing else. No name, no status, no
 *     record id, nothing that turns "this person works for PRL" into a profile.
 *   - it is rate limited per IP, well below the rate needed to walk a list.
 *   - it is a POST, so the address is never written to a URL, a referrer or an
 *     access log. See the privacy rule about PII in query strings.
 */

// Deliberately lower than the 20/hour the public form writes get: an applicant
// touches this two or three times, a list-walker needs thousands.
const LOOKUP_LIMIT = 60;
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!rateLimit(`apply-check-email:${ip}`, LOOKUP_LIMIT, LOOKUP_WINDOW_MS)) {
    return NextResponse.json({ error: "Too many checks. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const email = normaliseEmail(body?.email);

    // Not a usable address yet — the applicant is still typing. Say nothing.
    if (!email) return NextResponse.json({ registered: false, hasLogin: false });

    const existing = await prisma.contractor.findUnique({
      where: { email },
      select: { id: true, contractorLogin: { select: { id: true } } },
    });

    return NextResponse.json({
      registered: Boolean(existing),
      // Drives the wording only: a contractor imported from a spreadsheet has a
      // record but no password yet, and telling them to "log in" would strand
      // them. They need Set up account / Forgot password instead.
      hasLogin: Boolean(existing?.contractorLogin),
    });
  } catch {
    // Never block an application on this check failing. A silent false lets the
    // form carry on, and the unique constraint still catches it at submit.
    return NextResponse.json({ registered: false, hasLogin: false });
  }
}
