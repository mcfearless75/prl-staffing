"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * Log a user activity for audit trail
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  details?: string
) {
  try {
    const session = await auth();
    const user = session?.user;

    await prisma.activityLog.create({
      data: {
        userId: (user as { id?: string })?.id || null,
        userName: user?.name || "System",
        userEmail: user?.email || null,
        action,
        entityType,
        entityId: entityId || null,
        details: details || null,
      },
    });
  } catch {
    // Don't let logging errors break the app
    console.error("Failed to log activity");
  }
}

/**
 * Get activity logs with optional filters
 */
export async function getActivityLogs(options?: {
  userId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  return prisma.activityLog.findMany({
    where: {
      ...(options?.userId && { userId: options.userId }),
      ...(options?.entityType && { entityType: options.entityType }),
      ...(options?.entityId && { entityId: options.entityId }),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 100,
  });
}
