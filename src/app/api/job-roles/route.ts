import { NextResponse } from "next/server";
import { listActiveJobRoles } from "@/lib/job-roles";

/**
 * GET /api/job-roles
 *
 * Active job roles for the public application form's role picker.
 *
 * Unauthenticated and read-only. Role names are the trades PRL advertises for
 * and are not sensitive; the equivalent list is already served unauthenticated
 * to the setup-account flow. This exists as its own route rather than reusing
 * /api/auth/setup-account/roles so the public form is not coupled to an auth
 * endpoint's URL, and so either can change independently.
 *
 * Reads the JobRole table live, so the form stays in step with the curated list
 * automatically — roles added, renamed or deactivated in PRISM appear or vanish
 * here with no code change. Deactivating a role hides it from new applicants
 * without breaking historic applications, since those store the role id.
 */
export async function GET() {
  try {
    const roles = await listActiveJobRoles();
    return NextResponse.json({ roles });
  } catch (err) {
    console.error("job-roles GET error:", err);
    return NextResponse.json(
      { error: "Could not load job roles." },
      { status: 500 }
    );
  }
}
