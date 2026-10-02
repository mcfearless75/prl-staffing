import { prisma } from "@/lib/db";

export interface WorkflowResult {
  workflow: string;
  acted: number;
  skipped: number;
  failed: number;
  log: string[];
}

export interface WorkflowAgent {
  name: string;
  run(): Promise<WorkflowResult>;
}

/** Log a workflow action to the database */
export async function logAction(
  workflow: string,
  action: string,
  outcome: "sent" | "skipped" | "failed" | "escalated",
  target?: string,
  detail?: string
) {
  await prisma.workflowLog.create({
    data: { workflow, action, outcome, target, detail },
  });
}

/**
 * Check if we already ran a specific action for this target today.
 * Pass `outcome` to count only that outcome (e.g. "sent", so a failed send
 * doesn't block a retry).
 */
export async function alreadyActedToday(
  workflow: string,
  target: string,
  action: string,
  outcome?: "sent" | "skipped" | "failed" | "escalated"
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.workflowLog.count({
    where: { workflow, target, action, createdAt: { gte: today }, ...(outcome ? { outcome } : {}) },
  });
  return count > 0;
}

/** Check if we have ever acted on this target with this action */
export async function everActed(
  workflow: string,
  target: string,
  action: string
): Promise<boolean> {
  const count = await prisma.workflowLog.count({
    where: { workflow, target, action },
  });
  return count > 0;
}

/** Is this workflow switched on at /workflows? No setting saved = off. */
export async function isWorkflowEnabled(workflow: string): Promise<boolean> {
  const setting = await prisma.workflowSetting.findUnique({ where: { workflow } });
  return setting?.enabled ?? false;
}

/** Run all registered workflow agents and return aggregated results */
export async function runAllWorkflows(agents: WorkflowAgent[]) {
  const results: WorkflowResult[] = [];
  for (const agent of agents) {
    try {
      const result = await agent.run();
      results.push(result);
    } catch (err) {
      results.push({
        workflow: agent.name,
        acted: 0,
        skipped: 0,
        failed: 1,
        log: [`Agent crashed: ${String(err)}`],
      });
    }
  }
  return results;
}
