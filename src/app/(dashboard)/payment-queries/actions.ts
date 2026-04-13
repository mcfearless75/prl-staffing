"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function assignQuery(id: string, assignedTo: string) {
  try {
    const session = await auth();
    await prisma.paymentQuery.update({
      where: { id },
      data: { status: "Assigned", assignedTo, assignedAt: new Date() },
    });
    await prisma.activityLog.create({
      data: { action: "QUERY_ASSIGNED", entityType: "PaymentQuery", entityId: id, userName: session?.user?.name, userEmail: session?.user?.email, details: `Assigned to ${assignedTo}` },
    });
    revalidatePath("/payment-queries");
    revalidatePath(`/payment-queries/${id}`);
  } catch (error) { if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error; console.error(error); throw new Error("Failed to assign query"); }
}

export async function resolveQuery(id: string, resolutionNotes: string) {
  try {
    const session = await auth();
    await prisma.paymentQuery.update({
      where: { id },
      data: { status: "Resolved", resolvedAt: new Date(), resolvedBy: session?.user?.name || session?.user?.email || "Unknown", resolutionNotes },
    });
    await prisma.activityLog.create({
      data: { action: "QUERY_RESOLVED", entityType: "PaymentQuery", entityId: id, userName: session?.user?.name, userEmail: session?.user?.email, details: `Resolved: ${resolutionNotes}` },
    });
    revalidatePath("/payment-queries");
    revalidatePath(`/payment-queries/${id}`);
  } catch (error) { if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error; console.error(error); throw new Error("Failed to resolve query"); }
}

export async function closeQuery(id: string) {
  try {
    const session = await auth();
    await prisma.paymentQuery.update({
      where: { id },
      data: { status: "Closed", closedAt: new Date(), closedBy: session?.user?.name || session?.user?.email || "Unknown" },
    });
    await prisma.activityLog.create({
      data: { action: "QUERY_CLOSED", entityType: "PaymentQuery", entityId: id, userName: session?.user?.name, userEmail: session?.user?.email, details: "Query closed" },
    });
    revalidatePath("/payment-queries");
    revalidatePath(`/payment-queries/${id}`);
  } catch (error) { if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error; console.error(error); throw new Error("Failed to close query"); }
}
