import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-staff";

/**
 * GDPR Data Retention Cleanup
 * GET /api/gdpr/cleanup?key=ADMIN_SECRET — requires an admin session too.
 *
 * Deletes:
 * - Expired & used password reset tokens, or tokens expired > 24h ago
 * - ActivityLog entries older than 3 years
 * - TimesheetAuditLog entries older than 3 years
 *
 * ADMIN_SECRET is not set in Railway, so the key check has been failing closed
 * and this route is dormant. The session guard is what keeps it safe if that
 * var is ever added — a deletion endpoint should not be reachable by URL alone.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeYearsAgo = new Date(now);
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    // Delete expired & used tokens, or tokens that expired more than 24 hours ago
    const expiredTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now }, used: true },
          { expiresAt: { lt: twentyFourHoursAgo } },
        ],
      },
    });

    // Delete activity logs older than 3 years
    const oldActivityLogs = await prisma.activityLog.deleteMany({
      where: {
        createdAt: { lt: threeYearsAgo },
      },
    });

    // Delete timesheet audit logs older than 3 years
    const oldAuditLogs = await prisma.timesheetAuditLog.deleteMany({
      where: {
        createdAt: { lt: threeYearsAgo },
      },
    });

    return NextResponse.json({
      success: true,
      cleaned: {
        expiredTokens: expiredTokens.count,
        oldActivityLogs: oldActivityLogs.count,
        oldAuditLogs: oldAuditLogs.count,
      },
      retentionPolicy: {
        passwordResetTokens: "Expired & used, or expired > 24 hours",
        activityLogs: "Older than 3 years",
        timesheetAuditLogs: "Older than 3 years",
      },
      cleanedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("GDPR cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
