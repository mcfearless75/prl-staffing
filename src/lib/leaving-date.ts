// A contractor's leaving date: once it has passed they become Inactive
// (PRL, 2026-09-27: "add end date on profile and it automatically makes them
// inactive"). Pure so the rule is testable; the daily run lives in
// src/lib/workflows/leaving-date.ts and the form applies it on save.

import { prisma } from "@/lib/db";
import { AUTO_DEACTIVATE_FROM } from "@/lib/contractor-status";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";

export type LeavingDateDecision = "none" | "deactivate" | "blocked-live-work";

/**
 * The leaving date is their LAST WORKING DAY, so they go Inactive the day
 * after it, never on it (PRL, 2026-10-01). Date-only values are stored as UTC
 * midnight (see parseLeavingDate), so "passed" means before the start of
 * today in UTC.
 *
 * Only ever moves Active, the one status automation may demote from. Someone
 * with live work is held back rather than deactivated: the assignment rules
 * would flip them straight back to Active, and ending their jobs is a staff
 * decision because it affects billing.
 */
export function leavingDateDecision(
  c: { status: string; leavingDate: Date | null; hasLiveWork: boolean },
  now: Date = new Date()
): LeavingDateDecision {
  if (!c.leavingDate || c.status !== AUTO_DEACTIVATE_FROM) return "none";
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  if (c.leavingDate >= startOfToday) return "none";
  return c.hasLiveWork ? "blocked-live-work" : "deactivate";
}

/**
 * Applies the rule to one contractor straight after a save, so a leaving date
 * already in the past takes effect now rather than at the next daily run.
 */
export async function applyLeavingDate(contractorId: string): Promise<LeavingDateDecision> {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      status: true,
      leavingDate: true,
      assignments: { where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } }, select: { id: true } },
    },
  });
  if (!c) return "none";
  const decision = leavingDateDecision({ ...c, hasLiveWork: c.assignments.length > 0 });
  if (decision === "deactivate") {
    await prisma.contractor.updateMany({
      where: { id: contractorId, status: AUTO_DEACTIVATE_FROM },
      data: { status: "Inactive" },
    });
  }
  return decision;
}

/** A `<input type="date">` value ("YYYY-MM-DD") as UTC midnight; anything else is null. */
export function parseLeavingDate(raw: string | null | undefined): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(raw) ? d : null;
}
