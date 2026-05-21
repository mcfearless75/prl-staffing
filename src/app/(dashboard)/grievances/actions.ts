"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateGrievanceStatus(
  id: string,
  status: string,
  notes?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorised");

  const userName = session.user.name || session.user.email || "Staff";
  const userEmail = session.user.email || "";

  const updateData: Record<string, unknown> = { status };

  if (status === "Assigned") {
    updateData.assignedTo = userName;
    updateData.assignedAt = new Date();
  }
  if (status === "Resolved") {
    updateData.resolvedBy = userName;
    updateData.resolvedAt = new Date();
    if (notes) updateData.resolutionNotes = notes;
  }
  if (status === "Closed") {
    updateData.closedBy = userName;
    updateData.closedAt = new Date();
    if (notes) updateData.resolutionNotes = notes;
  }

  await prisma.grievance.update({ where: { id }, data: updateData });

  await prisma.activityLog.create({
    data: {
      action: "GRIEVANCE_STATUS",
      entityType: "Grievance",
      entityId: id,
      userEmail,
      userName,
      details: `Grievance status updated to ${status}${notes ? `: ${notes}` : ""}`,
    },
  });

  revalidatePath("/grievances");
  revalidatePath(`/grievances/${id}`);
}
