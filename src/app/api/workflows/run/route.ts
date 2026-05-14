import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAllWorkflows } from "@/lib/workflows/engine";
import { complianceChaseAgent } from "@/lib/workflows/compliance-chase";
import { welcomeAgent } from "@/lib/workflows/welcome-agent";
import { staleApplicantAgent } from "@/lib/workflows/stale-applicant";

const agents = [complianceChaseAgent, welcomeAgent, staleApplicantAgent];

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

  // Otherwise require authenticated session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const results = await runAllWorkflows(agents);
  return NextResponse.json({ ok: true, results });
}
