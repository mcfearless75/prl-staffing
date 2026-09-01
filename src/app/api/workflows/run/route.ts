import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { runAllWorkflows } from "@/lib/workflows/engine";
import { complianceChaseAgent } from "@/lib/workflows/compliance-chase";
import { complianceDigestAgent } from "@/lib/workflows/compliance-digest";
import { welcomeAgent } from "@/lib/workflows/welcome-agent";
import { staleApplicantAgent } from "@/lib/workflows/stale-applicant";
import { placedToActiveAgent } from "@/lib/workflows/placed-to-active";
import { bounceCheckAgent } from "@/lib/workflows/bounce-check";

const agents = [
  // Runs first: flags any contractor whose email hard-bounced since the last
  // run. Nothing below skips a flagged contractor yet — the send-side agents
  // don't check emailBounced — so this only makes the flag as fresh as
  // possible for whoever's looking at the contractor record today.
  bounceCheckAgent,
  // Runs next: the status flips it makes are read by the compliance agents
  // below, so a contractor starting today is chased as working, not as pending.
  placedToActiveAgent,
  complianceChaseAgent,
  complianceDigestAgent,
  welcomeAgent,
  staleApplicantAgent,
];

/**
 * POST /api/workflows/run
 * Triggers all workflow agents.
 * Auth: valid session OR X-Workflow-Secret header matching WORKFLOW_SECRET env var.
 * Safe to call from Railway cron or external scheduler (cron-job.org etc.)
 */
export async function POST(req: NextRequest) {
  // Allow cron triggers via secret header
  const secret = req.headers.get("x-workflow-secret");
  if (secret && secret === process.env.WORKFLOW_SECRET) {
    const results = await runAllWorkflows(agents);
    return NextResponse.json({ ok: true, results });
  }

  // Otherwise require an authenticated STAFF session.
  //
  // This was a bare `session?.user` check, which the middleware matcher does
  // not cover for /api/* paths — so any logged-in CONTRACTOR could POST here
  // and run the whole agent pipeline on demand: mass contractor email, plus
  // assignment and contractor status mutations. requireStaff() exists for
  // exactly this case; this route simply never used it.
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorised" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }

  const results = await runAllWorkflows(agents);
  return NextResponse.json({ ok: true, results });
}
