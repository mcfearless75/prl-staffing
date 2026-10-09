import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { STAFF_RECIPIENT_TYPE } from "@/lib/staff-notifications";
import { STAFF_ROLE_PENDING } from "@/lib/staff-access";

/**
 * Put one alert on every staff member's bell and Notifications page (Erica,
 * 2026-10-07: "keep all comms on one system"). The office works as one team,
 * so worker replies, uploads and profile changes go to everyone, the same way
 * the admin@ emails do. Staff still awaiting approval get nothing. Never
 * throws: an alert failing must not fail what triggered it.
 */
export async function notifyAllStaff(alert: { title: string; body: string; url: string }): Promise<void> {
  try {
    const staff = await prisma.user.findMany({ where: { role: { not: STAFF_ROLE_PENDING } }, select: { id: true } });
    if (staff.length === 0) return;
    // One id for all the copies, so opening any one marks them all read.
    const groupId = randomUUID();
    await prisma.notification.createMany({
      data: staff.map((u) => ({
        recipientType: STAFF_RECIPIENT_TYPE,
        recipientId: u.id,
        title: alert.title.slice(0, 200),
        body: alert.body.slice(0, 500),
        url: alert.url,
        groupId,
      })),
    });
  } catch (err) {
    console.error("[staff-notify] failed:", err instanceof Error ? err.message : err);
  }
}
