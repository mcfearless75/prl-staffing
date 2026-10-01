"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { DO_NOT_EMPLOY_REASON_MAX } from "@/lib/do-not-employ";

type Result = { ok: true } | { ok: false; message: string };

/**
 * Set, edit or clear "Do not employ". Setting it also makes them Inactive;
 * clearing it leaves the status alone (staff re-activate deliberately).
 */
export async function setDoNotEmploy(contractorId: string, on: boolean, reasonRaw: string): Promise<Result> {
  const guard = await requireStaff();
  if (!guard.ok) return { ok: false, message: "Only staff can do this." };

  const reason = reasonRaw.trim().slice(0, DO_NOT_EMPLOY_REASON_MAX);
  if (on && !reason) return { ok: false, message: "Please add a note saying why." };

  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { doNotEmploy: true, doNotEmployReason: true, status: true },
  });
  if (!c) return { ok: false, message: "Contractor not found." };

  const by = guard.session.user.name || guard.session.user.email || "staff";

  if (on) {
    await prisma.contractor.update({
      where: { id: contractorId },
      data: {
        doNotEmploy: true,
        doNotEmployReason: reason,
        // Keep the original date/author when only the note is being edited.
        doNotEmployAt: c.doNotEmploy ? undefined : new Date(),
        doNotEmployBy: c.doNotEmploy ? undefined : by,
        status: "Inactive",
      },
    });
    await logActivity(
      c.doNotEmploy ? "Do not employ note edited" : "Marked do not employ",
      "Contractor",
      contractorId,
      `${reason}${!c.doNotEmploy && c.status !== "Inactive" ? ` (status ${c.status} → Inactive)` : ""}`
    );
  } else {
    if (!c.doNotEmploy) return { ok: true };
    await prisma.contractor.update({
      where: { id: contractorId },
      data: { doNotEmploy: false, doNotEmployReason: null, doNotEmployAt: null, doNotEmployBy: null },
    });
    // The old reason goes into the log so clearing the flag doesn't erase the history.
    await logActivity("Do not employ removed", "Contractor", contractorId, `Was: ${c.doNotEmployReason ?? "(no note)"}`);
  }

  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath("/contractors");
  return { ok: true };
}
