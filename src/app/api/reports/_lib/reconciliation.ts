import { prisma } from "@/lib/db";

const MISMATCH_TOLERANCE = 0.01; // £0.01

export interface ReconciliationRow {
  invoiceId: string;
  invoiceNumber: string;
  company: string;
  status: string;
  matchStatus: string;
  linesTotal: number;
  invoiceTotal: number;
  difference: number;
  orphanLineCount: number;
  flag: "Unreconciled" | "OK";
}

/**
 * Per non-Draft invoice: compares the sum of its lines against the invoice
 * total and counts "orphan" lines (no linked timesheet AND no linked
 * expense). Flags "Unreconciled" if there are orphan lines or the totals
 * differ by more than the tolerance.
 */
export async function getReconciliationReport(): Promise<ReconciliationRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "Draft" } },
    include: {
      company: true,
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map((invoice) => {
    const linesTotal = invoice.lines.reduce((sum, line) => sum + line.amount, 0);
    const invoiceTotal = invoice.total;
    const difference = Math.round((linesTotal - invoiceTotal) * 100) / 100;
    const orphanLineCount = invoice.lines.filter((line) => !line.timesheetId && !line.expenseId).length;
    const mismatched = Math.abs(difference) > MISMATCH_TOLERANCE;
    const flag: "Unreconciled" | "OK" = orphanLineCount > 0 || mismatched ? "Unreconciled" : "OK";

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      company: invoice.company.name,
      status: invoice.status,
      matchStatus: invoice.matchStatus,
      linesTotal: Math.round(linesTotal * 100) / 100,
      invoiceTotal,
      difference,
      orphanLineCount,
      flag,
    };
  });
}
