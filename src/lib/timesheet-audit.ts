/**
 * Timesheet audit trail - logs every modification
 */

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

interface AuditEntry {
  timesheetId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

async function getCurrentUser() {
  try {
    const session = await auth();
    return {
      userId: (session?.user as { id?: string })?.id || null,
      userName: session?.user?.name || "System",
    };
  } catch {
    return { userId: null, userName: "System" };
  }
}

/**
 * Log a single audit entry
 */
export async function logTimesheetAudit(entry: AuditEntry) {
  const { userId, userName } = await getCurrentUser();
  await prisma.timesheetAuditLog.create({
    data: {
      timesheetId: entry.timesheetId,
      action: entry.action,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      userId,
      userName,
    },
  });
}

/**
 * Log multiple audit entries at once (e.g., when editing multiple day entries)
 */
export async function logTimesheetAuditBatch(entries: AuditEntry[]) {
  const { userId, userName } = await getCurrentUser();
  await prisma.timesheetAuditLog.createMany({
    data: entries.map((entry) => ({
      timesheetId: entry.timesheetId,
      action: entry.action,
      field: entry.field,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      userId,
      userName,
    })),
  });
}

/**
 * Get the full audit trail for a timesheet
 */
export async function getTimesheetAuditTrail(timesheetId: string) {
  return prisma.timesheetAuditLog.findMany({
    where: { timesheetId },
    orderBy: { createdAt: "desc" },
  });
}
