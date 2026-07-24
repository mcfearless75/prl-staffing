"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";

/**
 * Approve a pending holiday request: creates the HolidayLedger Payment row
 * (this is what actually reduces the derived balance) and marks the request
 * Approved. A separate "Mark paid" action later flips status to Paid once
 * payroll has actually processed it.
 */
export async function approveHolidayRequest(id: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const request = await prisma.holidayRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Holiday request not found");
  if (request.status !== "Pending") {
    throw new Error(`Cannot approve a holiday request with status "${request.status}".`);
  }

  const reviewer = guard.session.user.email || "staff";

  await prisma.$transaction([
    prisma.holidayLedger.create({
      data: {
        contractorId: request.contractorId,
        type: "Payment",
        hours: request.hoursRequested,
        notes: `Holiday request ${request.id} approved`,
        createdBy: reviewer,
      },
    }),
    prisma.holidayRequest.update({
      where: { id },
      data: { status: "Approved", reviewedBy: reviewer, reviewedAt: new Date() },
    }),
  ]);

  await logActivity("Approved Holiday Request", "HolidayRequest", id, `Approved by ${reviewer}`);

  revalidatePath("/holiday");
}

export async function rejectHolidayRequest(id: string, reason: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  if (!reason || !reason.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const request = await prisma.holidayRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Holiday request not found");
  if (request.status !== "Pending") {
    throw new Error(`Cannot reject a holiday request with status "${request.status}".`);
  }

  const reviewer = guard.session.user.email || "staff";

  await prisma.holidayRequest.update({
    where: { id },
    data: { status: "Rejected", reviewedBy: reviewer, reviewedAt: new Date(), notes: reason.trim() },
  });

  await logActivity("Rejected Holiday Request", "HolidayRequest", id, reason.trim());

  revalidatePath("/holiday");
}

export async function markHolidayRequestPaid(id: string) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const request = await prisma.holidayRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Holiday request not found");
  if (request.status !== "Approved") {
    throw new Error(`Cannot mark paid a holiday request with status "${request.status}".`);
  }

  const reviewer = guard.session.user.email || "staff";

  await prisma.holidayRequest.update({
    where: { id },
    data: { status: "Paid" },
  });

  await logActivity("Marked Holiday Request Paid", "HolidayRequest", id, `Marked paid by ${reviewer}`);

  revalidatePath("/holiday");
}

export async function createHolidayAdjustment(formData: FormData) {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const contractorId = (formData.get("contractorId") as string) || "";
  const hours = parseFloat((formData.get("hours") as string) || "");
  const note = ((formData.get("note") as string) || "").trim();

  if (!contractorId) throw new Error("Select a contractor.");
  if (!Number.isFinite(hours) || hours === 0) throw new Error("Enter a non-zero adjustment in hours.");
  if (!note) throw new Error("A note is required for manual adjustments.");

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor || contractor.employmentType !== "PAYE") {
    throw new Error("Holiday adjustments only apply to PAYE contractors.");
  }

  const adjuster = guard.session.user.email || "staff";

  await prisma.holidayLedger.create({
    data: {
      contractorId,
      type: "Adjustment",
      hours,
      notes: note,
      createdBy: adjuster,
    },
  });

  await logActivity("Holiday Adjustment", "Contractor", contractorId, `${hours > 0 ? "+" : ""}${hours}h — ${note}`);

  revalidatePath("/holiday");
}
