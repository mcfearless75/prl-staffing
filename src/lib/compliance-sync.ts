import { prisma } from "@/lib/db";

/**
 * Scans all compliance records and updates statuses based on expiry dates.
 * - Expired: expiryDate is in the past
 * - Expiring: expiryDate is within 30 days
 * Only updates records that currently have a "good" status (Verified/Pending)
 * to avoid overwriting manually set Non-Compliant statuses.
 */
export async function syncComplianceStatuses() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  // Mark expired records (expiryDate < now, currently not already Expired/Non-Compliant)
  await prisma.complianceRecord.updateMany({
    where: {
      expiryDate: { lt: now },
      status: { notIn: ["Expired", "Non-Compliant"] },
    },
    data: { status: "Expired" },
  });

  // Mark expiring records (expiryDate within 30 days, currently Verified/Pending)
  await prisma.complianceRecord.updateMany({
    where: {
      expiryDate: { gte: now, lte: thirtyDaysFromNow },
      status: { in: ["Verified", "Pending"] },
    },
    data: { status: "Expiring" },
  });
}
