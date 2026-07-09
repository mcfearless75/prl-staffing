"use server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Get next invoice number (INV-0001, INV-0002, etc.)
 *
 * Computes the max from ALL existing invoice numbers (parsed as integers),
 * not a lexicographic (string) sort — "INV-10000" sorts before "INV-9999"
 * alphabetically, which would return a stale/lower number past 4 digits.
 *
 * Accepts a transaction client so callers can run the read + the eventual
 * create inside the same `prisma.$transaction`, keeping the read atomic
 * with the write it feeds.
 */
async function getNextInvoiceNumber(
  tx: Prisma.TransactionClient | typeof prisma
): Promise<string> {
  const invoices = await tx.invoice.findMany({
    select: { invoiceNumber: true },
  });

  const maxNum = invoices.reduce((max, inv) => {
    const n = parseInt(inv.invoiceNumber.replace("INV-", ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

  return `INV-${String(maxNum + 1).padStart(4, "0")}`;
}

/**
 * Auto-generate invoices from approved timesheets for a given period
 */
export async function generateInvoices(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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

    // Generate one invoice per company. The whole batch is pure DB work (no
    // emails or other side effects here), so it runs inside a single
    // Serializable transaction: every invoice number is read and consumed
    // atomically, so two companies in this same call — or two concurrent
    // calls to this action — can never be handed the same number, and a
    // failure partway through rolls the whole batch back instead of leaving
    // some companies invoiced and others not.
    const runBatch = () =>
      prisma.$transaction(
        async (tx) => {
          const ids: string[] = [];

          for (const [cId, { timesheets: companyTimesheets }] of byCompany) {
            const invoiceNumber = await getNextInvoiceNumber(tx);

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
              // chargeRate is hourly (see schema). dayRate is per-day and must NOT
              // be used against hours — if no hourly charge rate is set, bill 0 and
              // flag the line so it gets fixed before the invoice is sent.
              const chargeRate = contractor.chargeRate || 0;
              const missingChargeRate = !contractor.chargeRate;
              const overtimeRate = chargeRate * 1.5;
              const regularHours = ts.totalHours - ts.overtimeHours;
              const amount =
                regularHours * chargeRate + ts.overtimeHours * overtimeRate;

              lines.push({
                contractorId: contractor.id,
                timesheetId: ts.id,
                description: `${contractor.firstName.charAt(0)}. ${contractor.lastName} - ${ts.assignment?.role || contractor.jobTitle || "Contractor"}${missingChargeRate ? " [NO CHARGE RATE SET]" : ""}`,
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

            const invoice = await tx.invoice.create({
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

            ids.push(invoice.id);
          }

          return ids;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

    // A Serializable transaction can abort with a write-conflict error
    // (P2034) if another invoice batch commits in the same window — retry
    // once with a freshly recomputed invoice number rather than surfacing a
    // spurious failure to the user.
    let invoiceIds: string[];
    try {
      invoiceIds = await runBatch();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2034" || code === "P2002") {
        invoiceIds = await runBatch();
      } else {
        throw error;
      }
    }

    revalidatePath("/billing");
    if (invoiceIds.length === 1) {
      redirect(`/billing/${invoiceIds[0]}`);
    }
    redirect("/billing");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to generate invoices:", error);
    throw new Error("Failed to generate invoices. Please try again.");
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
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
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    throw new Error("Failed to update invoice status. Please try again.");
  }
}

/**
 * Delete a draft invoice
 */
export async function deleteInvoice(id: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  try {
    await prisma.invoice.delete({ where: { id } });
    revalidatePath("/billing");
    redirect("/billing");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete invoice:", error);
    throw new Error("Failed to delete invoice. Please try again.");
  }
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
