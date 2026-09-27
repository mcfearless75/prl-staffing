import { prisma } from "@/lib/db";
import { logAction } from "./engine";
import type { WorkflowResult } from "./engine";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { retentionDue, RETENTION_MONTHS } from "@/lib/declarations";
import { eraseDeclarations } from "@/lib/declaration-store";

/**
 * Deletes Health & declarations answers RETENTION_MONTHS after the worker
 * leaves (Paul, 2026-09-27: 12 months). Only reads plain dates — it never needs
 * to decrypt anything. Each erasure is recorded in SensitiveAccessLog.
 */
export const declarationRetentionAgent = {
  name: "declaration-retention",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = { workflow: "declaration-retention", acted: 0, skipped: 0, failed: 0, log: [] };
    const now = new Date();

    const rows = await prisma.sensitiveDeclaration.findMany({
      where: { contractor: { status: "Inactive" } },
      select: {
        contractorId: true,
        declaredAt: true,
        updatedAt: true,
        contractor: {
          select: {
            status: true,
            leavingDate: true,
            assignments: { select: { status: true, endDate: true } },
          },
        },
      },
    });

    for (const r of rows) {
      const jobs = r.contractor.assignments;
      const ends = jobs.map((a) => a.endDate).filter((d): d is Date => d !== null);
      const due = retentionDue(
        {
          status: r.contractor.status,
          hasLiveWork: jobs.some((a) => (LIVE_ASSIGNMENT_STATUSES as readonly string[]).includes(a.status)),
          leavingDate: r.contractor.leavingDate,
          lastJobEnd: ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null,
          // The answers' own date is the LAST time they were given or changed.
          declaredAt: r.updatedAt > r.declaredAt ? r.updatedAt : r.declaredAt,
        },
        now
      );
      if (!due) {
        result.skipped++;
        continue;
      }
      try {
        await eraseDeclarations(r.contractorId, "erase-retention", "system");
        await logAction("declaration-retention", "erase", "sent", r.contractorId, `${RETENTION_MONTHS}-month retention`);
        result.acted++;
      } catch (err) {
        console.error(`[declaration-retention] Failed for ${r.contractorId}:`, err instanceof Error ? err.message : err);
        result.failed++;
      }
    }

    result.log.push(
      result.acted ? `✓ Erased declarations for ${result.acted} leaver(s)` : "No declarations past retention."
    );
    return result;
  },
};
