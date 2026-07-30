import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

/**
 * GET /api/qms-reports/customer-feedback
 *
 * Feeds the QMS customer feedback report.
 *
 * This used to read ActivityLog rows with action "SURVEY" and parse their
 * details JSON, because that was the only record kept before the CustomerSurvey
 * table existed (added 2026-07-29). /api/survey writes both, so the report
 * happened to keep working — but it meant the ISO 9001 customer-satisfaction
 * evidence was being read out of an audit log rather than its own table. Anyone
 * reasonably concluding "we have a real table now, the log row is redundant"
 * would have silently emptied this report.
 *
 * Now reads CustomerSurvey as the canonical source, and still includes legacy
 * ActivityLog entries that have no corresponding CustomerSurvey row, so surveys
 * captured before that table existed are not dropped from the report.
 */
export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }

  const [surveys, logs] = await Promise.all([
    prisma.customerSurvey.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.activityLog.findMany({
      where: { action: "SURVEY" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const canonical = surveys.map((s) => ({
    id: s.id,
    createdAt: s.createdAt,
    companyName: s.companyName,
    contactName: s.contactName,
    contactEmail: s.contactEmail,
    dateOfService: s.dateOfService,
    overallSatisfaction: s.overallSatisfaction,
    qualityOfWorkers: s.qualityOfWorkers,
    communication: s.communication,
    compliance: s.compliance,
    valueForMoney: s.valueForMoney,
    recommend: s.recommend,
    whatDidWell: s.whatDidWell,
    whatToImprove: s.whatToImprove,
    otherComments: s.otherComments,
    status: s.status,
  }));

  // A log row is legacy only if no CustomerSurvey row represents it. /api/survey
  // sets entityId to the survey id, so that is the reliable link.
  const represented = new Set(surveys.map((s) => s.id));
  const legacy = logs
    .filter((log) => !log.entityId || !represented.has(log.entityId))
    .map((log) => {
      let details: Record<string, unknown> = {};
      try {
        details = JSON.parse(log.details || "{}");
      } catch {
        // Malformed details must not take out the whole report.
      }
      return { id: log.id, createdAt: log.createdAt, ...details };
    });

  const responses = [...canonical, ...legacy].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(responses);
}
