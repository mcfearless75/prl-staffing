"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function acknowledgePolicy(userId: string, userEmail: string, userName: string) {
  // Check if already acknowledged current version
  const existing = await prisma.policyAcknowledgement.findFirst({
    where: { userId, policyVersion: "1.0" },
  });

  if (existing) {
    return { error: "You have already acknowledged this policy version." };
  }

  await prisma.policyAcknowledgement.create({
    data: {
      userId,
      userEmail,
      userName,
      policyVersion: "1.0",
    },
  });

  revalidatePath("/qms/policy");
  return { success: true };
}
