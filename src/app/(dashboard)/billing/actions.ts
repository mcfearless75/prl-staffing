"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Get next invoice number (INV-0001, INV-0002, etc.)
 */
async function getNextInvoiceNumber(): Promise<string> {
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: "desc" },
  });

  if (!lastInvoice) return "INV-0001";

  const lastNum = parseInt(lastInvoice.invoiceNumber.replace("INV-", ""), 10);
  return `INV-${String(lastNum + 1).padStart(4, "0")}`;
}

/**
 * Auto-generate invoices from approved timesheets for a given period
 */
export async function generateInvoices(formData: FormData) {
  const periodStart = new Date(formData.get("periodStart") as string);
  const periodEnd = new Date(formData.get("periodEnd") as string);
  const companyId = (formData.get("companyId") as string) || null;
  const vatRate = parseFloat((formData.get("vatRate") as string) || "20");

  // Find approved timesheets in the period that haven't been invoiced yet
  const where: Record<string, unknown> = {
    status: "Approved",
    weekStarting: {
      gte: periodStart,
      lte: periodEnd,
    },
  };

  // Filter by company if specified (through assignment)
  if (companyId) {
    where.assignment = { companyId };
  }

  const timesheets = await prisma.timesheet.findMany({
    where,
    include: {
      contractor: true,
      assignment: { include: { company: true } },
    },
    orderBy: { weekStarting: "asc" },
  });

  if (timesheets.length === 0) {
    redirect("/billing/generate?error=no-timesheets");
  }

  // Check which timesheets are already on an invoice
  const existingLines = await prisma.invoiceLine.findMany({
    where: { timesheetId: { in: timesheets.map((t) => t.id) } },
    select: { timesheetId: true },
  });
  const invoicedTimesheetIds = new Set(existingLines.map((l) => l.timesheetId));

  // Filter out already-invoiced timesheets
  const uninvoicedTimesheets = timesheets.filter(
    (t) => !invoicedTimesheetIds.has(t.id)
  );

  if (uninvoicedTimesheets.length === 0) {
    redirect("/billing/generate?error=already-invoiced");
  }

  // Group timesheets by company
  const byCompany = new Map<
    string,
    {
      company: { id: string; name: string };
      timesheets: typeof uninvoicedTimesheets;
    }
  >();

  for (const ts of uninvoicedTimesheets) {
    const company = ts.assignment?.company;
    if (!company) continue;

    if (!byCompany.has(company.id)) {
      byCompany.set(company.id, { company, timesheets: [] });
    }
    byCompany.get(company.id)!.timesheets.push(ts);
  }

  // Generate one invoice per company
  const invoiceIds: string[] = [];

  for (const [cId, { company, timesheets: companyTimesheets }] of byCompany) {
    const invoiceNumber = await getNextInvoiceNumber();

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Get PO number from first assignment (if any)
    const poNumbers = [
      ...new Set(
        companyTimesheets
          .map((t) => t.assignment?.poNumber)
          .filter(Boolean)
      ),
    ];

    // Build invoice lines
    const lines: {
      contractorId: string;
      timesheetId: string;
      description: string;
      hours: number;
      overtimeHours: number;
      rate: number;
      overtimeRate: number;
      amount: number;
    }[] = [];

    for (const ts of companyTimesheets) {
      const contractor = ts.contractor;
      const chargeRate = contractor.chargeRate || contractor.dayRate || 0;
      const overtimeRate = chargeRate * 1.5;
      const regularHours = ts.totalHours - ts.overtimeHours;
      const amount =
        regularHours * chargeRate + ts.overtimeHours * overtimeRate;

      lines.push({
        contractorId: contractor.id,
        timesheetId: ts.id,
        description: `${contractor.firstName.charAt(0)}. ${contractor.lastName} - ${ts.assignment?.role || contractor.jobTitle || "Contractor"}`,
        hours: regularHours,
        overtimeHours: ts.overtimeHours,
        rate: chargeRate,
        overtimeRate,
        amount: Math.round(amount * 100) / 100,
      });
    }

    const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;

    // Determine match status based on PO
    const matchStatus = poNumbers.length > 0 ? "Partial" : "Unmatched";

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        companyId: cId,
        periodStart,
        periodEnd,
        vatRate,
        subtotal,
        vatAmount,
        total,
        dueDate,
        poNumber: poNumbers.join(", ") || null,
        matchStatus,
        lines: {
          create: lines,
        },
      },
    });

    invoiceIds.push(invoice.id);
  }

  revalidatePath("/billing");
  if (invoiceIds.length === 1) {
    redirect(`/billing/${invoiceIds[0]}`);
  }
  redirect("/billing");
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: string) {
  const data: Record<string, unknown> = { status };

  if (status === "Paid") {
    data.paidDate = new Date();
  }

  // Update match status when approved
  if (status === "Approved") {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (invoice?.poNumber && invoice.lines.every((l) => l.timesheetId)) {
      data.matchStatus = "Matched"; // PO + timesheets + invoice = 3-way match
    }
  }

  await prisma.invoice.update({ where: { id }, data });
  revalidatePath(`/billing/${id}`);
  revalidatePath("/billing");
}

/**
 * Delete a draft invoice
 */
export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/billing");
  redirect("/billing");
}

/**
 * Mark invoice as sent
 */
export async function markInvoiceSent(id: string) {
  return updateInvoiceStatus(id, "Sent");
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(id: string) {
  return updateInvoiceStatus(id, "Paid");
}

/**
 * Approve invoice (triggers three-way match check)
 */
export async function approveInvoice(id: string) {
  return updateInvoiceStatus(id, "Approved");
}
