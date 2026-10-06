"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/require-staff";
import { resolveOwnUserId } from "@/lib/staff-contact";
import { logActivity } from "@/lib/activity-log";
import { checkRoleChange, staffRoleLabel, STAFF_ROLE_ADMIN, STAFF_ROLE_PENDING } from "@/lib/staff-access";

export type SetRoleResult = { ok: true } | { ok: false; error: string };

/**
 * Admin sets another staff member's access (Admin / Staff / No access).
 * Takes effect on their next page load — the auth callback re-reads the role
 * every request. Removing access also bumps tokenVersion, which signs them out
 * everywhere.
 */
export async function setStaffRole(targetId: string, newRole: string): Promise<SetRoleResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: "Only an admin can change staff access." };

  const actorId = await resolveOwnUserId(guard.session.user);
  if (!actorId) return { ok: false, error: "We couldn't find your PRISM account." };
  if (typeof targetId !== "string" || !targetId) return { ok: false, error: "Unknown staff member." };

  const [actor, target, adminCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, email: true, role: true } }),
    prisma.user.count({ where: { role: STAFF_ROLE_ADMIN } }),
  ]);
  if (!target) return { ok: false, error: "That staff member no longer exists." };

  const check = checkRoleChange({
    actorId,
    actorRole: actor?.role,
    targetId: target.id,
    targetRole: target.role,
    newRole,
    adminCount,
  });
  if (!check.ok) return check;
  if (target.role === newRole) return { ok: true };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      role: newRole,
      ...(newRole === STAFF_ROLE_PENDING ? { tokenVersion: { increment: 1 } } : {}),
    },
  });

  // Clear their "waiting for access" alerts once someone has dealt with them.
  if (target.role === STAFF_ROLE_PENDING) {
    await prisma.notification
      .updateMany({
        where: { recipientType: "user", url: "/settings/staff", isRead: false, body: { startsWith: `${target.email} ` } },
        data: { isRead: true },
      })
      .catch(() => {});
  }

  await logActivity(
    "Staff access changed",
    "User",
    target.id,
    `${target.name} (${target.email}): ${staffRoleLabel(target.role)} → ${staffRoleLabel(newRole)}`
  );
  revalidatePath("/settings/staff");
  return { ok: true };
}
