import { prisma } from "@/lib/db";
import { logAction, alreadyActedToday } from "./engine";
import type { WorkflowResult } from "./engine";
import { activateContractorIfInactive } from "@/lib/contractor-status";

/**
 * Placed -> Active on the start date.
 *
 * Staff place a contractor with a start date that may be tomorrow or next week.
 * Nothing moved that assignment on when the day arrived, so "Placed" quietly
 * became a permanent state and the dashboard undercounted who was actually on
 * site. This agent does that transition once a day.
 *
 * Date handling: assignment start dates are written as `new Date("2026-07-30")`,
 * which the JS spec parses as UTC midnight, so a date-only value never carries a
 * BST offset. The window below is therefore "anything starting today or earlier"
 * expressed in UTC, and an assignment starting today flips on that day rather
 * than the day before.
 *
 * Late runs are safe. The query is a catch-up, not a same-day trigger: it looks
 * for every overdue Placed assignment, so a missed or drifted cron corrects
 * itself on the next run rather than skipping anyone permanently.
 */
export const placedToActiveAgent = {
  name: "placed-to-active",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = {
      workflow: "placed-to-active",
      acted: 0,
      skipped: 0,
      failed: 0,
      log: [],
    };

    // Start of tomorrow, UTC — so "startDate < this" means today or earlier.
    const startOfTomorrow = new Date();
    startOfTomorrow.setUTCHours(0, 0, 0, 0);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    const due = await prisma.assignment.findMany({
      where: { status: "Placed", startDate: { lt: startOfTomorrow } },
      select: {
        id: true,
        contractorId: true,
        startDate: true,
        role: true,
        company: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    });

    if (due.length === 0) {
      result.log.push("No Placed assignments have reached their start date.");
      return result;
    }

    for (const assignment of due) {
      // Belt and braces: the flip is self-clearing (an Active assignment no
      // longer matches the query above), so this only matters if a status is
      // manually pushed back to Placed on the same day.
      const alreadyDone = await alreadyActedToday("placed-to-active", assignment.id, "activate");
      if (alreadyDone) {
        result.skipped++;
        continue;
      }

      const startedOn = assignment.startDate.toISOString().slice(0, 10);

      try {
        // Guarded on status so a staff edit made between the read above and this
        // write is not silently overwritten.
        const updated = await prisma.assignment.updateMany({
          where: { id: assignment.id, status: "Placed" },
          data: { status: "Active" },
        });

        if (updated.count === 0) {
          result.skipped++;
          result.log.push(`- ${assignment.id} changed status before the update — left alone.`);
          continue;
        }

        // A Placed contractor should already be Active, but a contractor placed
        // while Inactive would otherwise start work still marked Inactive.
        await activateContractorIfInactive(assignment.contractorId);

        await logAction(
          "placed-to-active",
          "activate",
          "sent",
          assignment.id,
          `${assignment.role || "(no role)"} @ ${assignment.company?.name ?? "(no client)"} — start date ${startedOn}`
        );
        result.acted++;
        result.log.push(`✓ Activated assignment starting ${startedOn} (${assignment.role || "no role"})`);
      } catch (err) {
        console.error(`[placed-to-active] Failed to activate assignment ${assignment.id}:`, err);
        await logAction("placed-to-active", "activate", "failed", assignment.id, String(err));
        result.failed++;
        result.log.push(`✗ Failed to activate assignment starting ${startedOn} — ${String(err)}`);
      }
    }

    return result;
  },
};
