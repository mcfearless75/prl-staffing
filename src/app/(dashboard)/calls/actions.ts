"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";

export async function markActioned(id: string) {
  const guard = await requireStaff();
  if (!guard.ok) throw new Error("Unauthorised");

  try {
    await prisma.callEnquiry.update({
      where: { id },
      data: {
        status: "Actioned",
        actionedBy: guard.session.user.name || guard.session.user.email || "Unknown",
        actionedAt: new Date(),
      },
    });

    // Revalidate right after the state change succeeds, so the cache is
    // never left stale even if the (secondary) activity-log write below fails.
    revalidatePath("/calls");
    revalidatePath(`/calls/${id}`);

    await prisma.activityLog.create({
      data: {
        action: "CALL_ENQUIRY_ACTIONED",
        entityType: "CallEnquiry",
        entityId: id,
        userName: guard.session.user.name,
        userEmail: guard.session.user.email,
        details: "Marked actioned",
      },
    });
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error(error);
    throw new Error("Failed to mark call enquiry actioned");
  }
}
