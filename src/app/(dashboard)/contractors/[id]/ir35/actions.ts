"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveIR35Determination(
  contractorId: string,
  determination: string,
  answers: Record<string, string>,
  score: number
) {
  // Update contractor IR35 status
  await prisma.contractor.update({
    where: { id: contractorId },
    data: { ir35Status: determination },
  });

  // Upsert compliance record for IR35 Assessment
  const existing = await prisma.complianceRecord.findFirst({
    where: { contractorId, type: "IR35 Assessment" },
  });

  const notes = Object.entries(answers)
    .map(([q, a]) => `${q}: ${a}`)
    .join("\n");

  if (existing) {
    await prisma.complianceRecord.update({
      where: { id: existing.id },
      data: {
        status: "Verified",
        reference: `Score: ${score}/100 — ${determination}`,
        issueDate: new Date(),
        notes,
      },
    });
  } else {
    await prisma.complianceRecord.create({
      data: {
        contractorId,
        type: "IR35 Assessment",
        documentName: "IR35 Status Determination",
        reference: `Score: ${score}/100 — ${determination}`,
        status: "Verified",
        issueDate: new Date(),
        notes,
      },
    });
  }

  revalidatePath(`/contractors/${contractorId}`);
  redirect(`/contractors/${contractorId}`);
}
