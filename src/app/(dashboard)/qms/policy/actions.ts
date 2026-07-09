"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function acknowledgePolicy() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id?: string; email?: string; name?: string };
  const userId = user.id;
  const userEmail = user.email || "";
  const userName = user.name || "";

  if (!userId) redirect("/login");

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
