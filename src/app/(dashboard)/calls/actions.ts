"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markActioned(id: string) {
  try {
    const session = await auth();
    await prisma.callEnquiry.update({
      where: { id },
      data: {
        status: "Actioned",
        actionedBy: session?.user?.name || session?.user?.email || "Unknown",
        actionedAt: new Date(),
      },
    });
    await prisma.activityLog.create({
      data: {
        action: "CALL_ENQUIRY_ACTIONED",
        entityType: "CallEnquiry",
        entityId: id,
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        details: "Marked actioned",
      },
    });
    revalidatePath("/calls");
    revalidatePath(`/calls/${id}`);
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error(error);
    throw new Error("Failed to mark call enquiry actioned");
  }
}
