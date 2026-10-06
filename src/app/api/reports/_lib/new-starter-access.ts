import { NextResponse } from "next/server";
import { requireStaff, type StaffSession } from "@/lib/require-staff";
import { canRunNewStarterReport } from "@/lib/reports/new-starter-report";

/**
 * Guard for the New Starter Report endpoints: staff with role admin or
 * manager. Stricter than plain requireStaff because the report carries NI
 * numbers.
 */
export async function requireNewStarterReportAccess(): Promise<
  { ok: true; session: StaffSession } | { ok: false; response: NextResponse }
> {
  const guard = await requireStaff();
  if (!guard.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorised" },
        { status: guard.reason === "forbidden" ? 403 : 401 }
      ),
    };
  }
  if (!canRunNewStarterReport({ userType: "staff", role: guard.session.user.role })) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return guard;
}
