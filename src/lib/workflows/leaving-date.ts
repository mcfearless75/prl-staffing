import { prisma } from "@/lib/db";
import { logAction } from "./engine";
import type { WorkflowResult } from "./engine";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { AUTO_DEACTIVATE_FROM } from "@/lib/contractor-status";
import { leavingDateDecision } from "@/lib/leaving-date";

/**
 * Leaving date passed -> Inactive, once a day.
 *
 * A catch-up like Placed -> Active: it finds every Active contractor whose
 * leaving date is today or earlier, so a missed run corrects itself. Anyone
 * still on live work is logged and left Active — staff need to end the job.
 */
export const leavingDateAgent = {
  name: "leaving-date",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = { workflow: "leaving-date", acted: 0, skipped: 0, failed: 0, log: [] };
    const now = new Date();

    const candidates = await prisma.contractor.findMany({
      where: { status: AUTO_DEACTIVATE_FROM, leavingDate: { lte: now } },
      select: {
        id: true,
        status: true,
        leavingDate: true,
        assignments: { where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } }, select: { id: true } },
      },
    });

    if (candidates.length === 0) {
      result.log.push("Nobody has passed their leaving date.");
      return result;
    }

    for (const c of candidates) {
      const decision = leavingDateDecision({ ...c, hasLiveWork: c.assignments.length > 0 }, now);
      const leftOn = c.leavingDate?.toISOString().slice(0, 10);

      if (decision === "blocked-live-work") {
        result.skipped++;
        result.log.push(`- ${c.id}: leaving date ${leftOn} passed but still on live work — end their job first.`);
        continue;
      }
      if (decision !== "deactivate") {
        result.skipped++;
        continue;
      }

      try {
        // Guarded on status so a staff edit since the read is not overwritten.
        const updated = await prisma.contractor.updateMany({
          where: { id: c.id, status: AUTO_DEACTIVATE_FROM },
          data: { status: "Inactive" },
        });
        if (updated.count === 0) {
          result.skipped++;
          continue;
        }
        await logAction("leaving-date", "deactivate", "sent", c.id, `Leaving date ${leftOn} passed`);
        result.acted++;
        result.log.push(`✓ ${c.id} made Inactive (left ${leftOn})`);
      } catch (err) {
        console.error(`[leaving-date] Failed for ${c.id}:`, err);
        await logAction("leaving-date", "deactivate", "failed", c.id, String(err));
        result.failed++;
      }
    }

    return result;
  },
};
