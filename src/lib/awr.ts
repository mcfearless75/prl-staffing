import { prisma } from "@/lib/db";

/**
 * Agency Workers Regulations (AWR) 12-week qualifying clock.
 *
 * Clock rules (per contractor x company pair):
 * - A qualifying week is a distinct Timesheet.weekStarting with totalHours > 0
 *   and status in Submitted/Approved, for any (non-exempt) assignment of that
 *   contractor at that company.
 * - assignment.awrStartDate (earliest set value across the pair's assignments)
 *   overrides the clock start — weeks before it never count.
 * - A gap of up to 6 weeks between qualifying weeks pauses the clock: the
 *   missed weeks don't count, but the running total survives.
 * - A gap of more than 6 weeks resets the clock to zero from the next
 *   worked week.
 * - Trigger = 12 qualifying weeks.
 */

export const AWR_TRIGGER_WEEKS = 12;
export const AWR_MAX_GAP_WEEKS = 6;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type AwrBasis = "reached" | "below-comparable" | "future";

export interface AwrClockResult {
  contractorId: string;
  contractorName: string;
  contractorRef: string | null;
  companyId: string;
  companyName: string;
  qualifyingWeeks: number; // current running count, capped at AWR_TRIGGER_WEEKS
  triggerReached: boolean;
  triggerDate: Date | null;
  projectedTriggerDate: Date | null;
  comparatorBelow: boolean;
  comparatorRate: number | null;
  currentPayRate: number | null;
  status: "Not started" | "In progress" | "Triggered";
}

/**
 * Compute the AWR clock for every contractor x company pair with at least
 * one non-exempt assignment.
 */
export async function computeAwrClocks(): Promise<AwrClockResult[]> {
  const assignments = await prisma.assignment.findMany({
    where: { awrExempt: false },
    include: { contractor: true, company: true },
  });

  if (assignments.length === 0) return [];

  interface PairAccumulator {
    contractorId: string;
    contractorName: string;
    contractorRef: string | null;
    companyId: string;
    companyName: string;
    awrStartDates: Date[];
    activeAssignments: { payRate: number | null; comparatorRate: number | null }[];
  }

  const pairs = new Map<string, PairAccumulator>();
  const assignmentToPairKey = new Map<string, string>();

  for (const a of assignments) {
    const key = `${a.contractorId}::${a.companyId}`;
    assignmentToPairKey.set(a.id, key);

    let pair = pairs.get(key);
    if (!pair) {
      pair = {
        contractorId: a.contractorId,
        contractorName: `${a.contractor.firstName} ${a.contractor.lastName}`,
        contractorRef: a.contractor.ref,
        companyId: a.companyId,
        companyName: a.company.name,
        awrStartDates: [],
        activeAssignments: [],
      };
      pairs.set(key, pair);
    }

    if (a.awrStartDate) pair.awrStartDates.push(a.awrStartDate);
    if (a.status === "Active") {
      pair.activeAssignments.push({ payRate: a.payRate, comparatorRate: a.comparatorRate });
    }
  }

  const timesheets = await prisma.timesheet.findMany({
    where: {
      assignmentId: { in: assignments.map((a) => a.id) },
      status: { in: ["Submitted", "Approved"] },
      totalHours: { gt: 0 },
    },
    select: { assignmentId: true, weekStarting: true },
  });

  const pairWeeks = new Map<string, Set<number>>();
  for (const ts of timesheets) {
    if (!ts.assignmentId) continue;
    const key = assignmentToPairKey.get(ts.assignmentId);
    if (!key) continue;
    let set = pairWeeks.get(key);
    if (!set) {
      set = new Set();
      pairWeeks.set(key, set);
    }
    set.add(startOfDay(ts.weekStarting));
  }

  const results: AwrClockResult[] = [];

  for (const [key, pair] of pairs) {
    const weekSet = pairWeeks.get(key) ?? new Set<number>();
    let weeks = Array.from(weekSet).sort((a, b) => a - b);

    if (pair.awrStartDates.length > 0) {
      const overrideStart = Math.min(...pair.awrStartDates.map((d) => startOfDay(d)));
      weeks = weeks.filter((w) => w >= overrideStart);
    }

    const { count, triggerDate, lastWeek } = runClock(weeks);
    const triggerReached = triggerDate !== null;

    let projectedTriggerDate: Date | null = null;
    if (!triggerReached && lastWeek !== null && count > 0) {
      projectedTriggerDate = new Date(lastWeek + (AWR_TRIGGER_WEEKS - count) * MS_PER_WEEK);
    }

    const comparatorBelow = pair.activeAssignments.some(
      (a) => a.payRate !== null && a.comparatorRate !== null && a.payRate < a.comparatorRate
    );
    const latestActive = pair.activeAssignments.find((a) => a.comparatorRate !== null);

    results.push({
      contractorId: pair.contractorId,
      contractorName: pair.contractorName,
      contractorRef: pair.contractorRef,
      companyId: pair.companyId,
      companyName: pair.companyName,
      qualifyingWeeks: Math.min(count, AWR_TRIGGER_WEEKS),
      triggerReached,
      triggerDate,
      projectedTriggerDate,
      comparatorBelow,
      comparatorRate: latestActive?.comparatorRate ?? null,
      currentPayRate: latestActive?.payRate ?? null,
      status: triggerReached ? "Triggered" : count > 0 ? "In progress" : "Not started",
    });
  }

  // Stable, useful default ordering: triggered-and-below-comparator first, then by weeks desc.
  results.sort((a, b) => {
    if (a.triggerReached !== b.triggerReached) return a.triggerReached ? -1 : 1;
    return b.qualifyingWeeks - a.qualifyingWeeks;
  });

  return results;
}

/** Runs the pause/reset clock algorithm over a sorted list of distinct qualifying week timestamps. */
export function runClock(sortedWeeks: number[]): { count: number; triggerDate: Date | null; lastWeek: number | null } {
  let count = 0;
  let lastWeek: number | null = null;
  let triggerDate: Date | null = null;

  for (const w of sortedWeeks) {
    if (lastWeek === null) {
      count = 1;
    } else {
      const diffWeeks = Math.round((w - lastWeek) / MS_PER_WEEK);
      const gapWeeks = diffWeeks - 1;
      count = gapWeeks <= AWR_MAX_GAP_WEEKS ? count + 1 : 1;
    }
    if (count >= AWR_TRIGGER_WEEKS && !triggerDate) {
      // The clock trips when the 12th qualifying week COMPLETES, not when it
      // starts — so the trigger date is that week's weekStarting + 6 days.
      triggerDate = new Date(w + 6 * 24 * 60 * 60 * 1000);
    }
    lastWeek = w;
  }

  return { count, triggerDate, lastWeek };
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function filterAwrByBasis(clocks: AwrClockResult[], basis: AwrBasis): AwrClockResult[] {
  switch (basis) {
    case "reached":
      return clocks.filter((c) => c.triggerReached);
    case "below-comparable":
      return clocks.filter((c) => c.triggerReached && c.comparatorBelow);
    case "future":
      return clocks.filter((c) => !c.triggerReached);
    default:
      return clocks;
  }
}
