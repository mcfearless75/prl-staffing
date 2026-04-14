"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function createApprovalChain(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = formData.get("name") as string;
  const companyId = (formData.get("companyId") as string) || null;

  // Parse steps from form
  const steps: { stepOrder: number; approverRole: string; label: string }[] = [];
  let stepIndex = 1;
  while (formData.get(`step_${stepIndex}_label`)) {
    steps.push({
      stepOrder: stepIndex,
      approverRole: (formData.get(`step_${stepIndex}_role`) as string) || "manager",
      label: formData.get(`step_${stepIndex}_label`) as string,
    });
    stepIndex++;
  }

  if (steps.length === 0) {
    throw new Error("At least one approval step is required");
  }

  await prisma.approvalChain.create({
    data: {
      name,
      companyId: companyId || undefined,
      steps: {
        create: steps,
      },
    },
  });

  revalidatePath("/timesheets/approval-chains");
  redirect("/timesheets/approval-chains");
}

export async function deleteApprovalChain(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.approvalChain.delete({ where: { id } });
  revalidatePath("/timesheets/approval-chains");
}
