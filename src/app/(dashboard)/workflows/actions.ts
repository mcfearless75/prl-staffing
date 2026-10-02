"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

/** Workflows staff may switch on/off from /workflows. */
const SWITCHABLE = new Set(["compliance-chase"]);

export async function setWorkflowEnabledAction(
  workflow: string,
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, error: "Only staff can change this." };
  if (!SWITCHABLE.has(workflow)) return { ok: false, error: "This workflow can't be switched." };

  const by = guard.session.user.email || guard.session.user.name || "staff";
  await prisma.workflowSetting.upsert({
    where: { workflow },
    create: { workflow, enabled, updatedBy: by },
    update: { enabled, updatedBy: by },
  });
  await logActivity(
    `Automatic ${workflow} switched ${enabled ? "ON" : "OFF"}`,
    "Workflow",
    workflow,
    JSON.stringify({ by })
  );
  revalidatePath("/workflows");
  return { ok: true };
}
