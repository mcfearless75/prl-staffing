import { prisma } from "@/lib/db";

export type AgedDebtBucket = "Current" | "1-30" | "31-60" | "61-90" | "90+";

export interface AgedDebtRow {
  invoiceId: string;
  invoiceNumber: string;
  companyId: string;
  companyName: string;
  status: string;
  dueDate: Date | null;
  total: number;
  amountPaid: number;
  balance: number;
  daysPastDue: number;
  bucket: AgedDebtBucket;
}

function bucketFor(daysPastDue: number): AgedDebtBucket {
  if (daysPastDue <= 0) return "Current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

/**
 * Aged debt = unpaid balance (total − derived amountPaid) for every
 * non-Draft invoice, bucketed by days past dueDate. Invoices with no
 * outstanding balance (fully paid) are excluded.
 */
export async function getAgedDebtRows(): Promise<AgedDebtRow[]> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { not: "Draft" } },
    include: { company: true, payments: true },
    orderBy: { dueDate: "asc" },
  });

  const today = new Date();
  const rows: AgedDebtRow[] = [];

  for (const invoice of invoices) {
    const amountPaid = Math.round(invoice.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    const balance = Math.round((invoice.total - amountPaid) * 100) / 100;
    if (balance <= 0.01) continue;

    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
    const daysPastDue = dueDate
      ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    rows.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      companyId: invoice.companyId,
      companyName: invoice.company.name,
      status: invoice.status,
      dueDate,
      total: invoice.total,
      amountPaid,
      balance,
      daysPastDue,
      bucket: bucketFor(daysPastDue),
    });
  }

  return rows;
}
