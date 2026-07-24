import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";

/**
 * Sage 50 / Sage 200 compatible CSV export
 * Format follows Sage import specifications for sales invoices
 * Columns: Type, Account Ref, Nominal A/C, Date, Invoice No, Net Amount, Tax Code, Tax Amount, Description
 */
export async function GET(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const { searchParams } = new URL(request.url);
  const invoiceId = searchParams.get("invoiceId");

  if (!invoiceId) {
    return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      company: true,
      lines: {
        include: { contractor: true },
        orderBy: { description: "asc" },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Format date as DD/MM/YYYY for Sage
  const formatSageDate = (date: Date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Sage CSV header
  const headers = [
    "Type",
    "Account Ref",
    "Nominal A/C Ref",
    "Department",
    "Date",
    "Reference",
    "Details",
    "Net Amount",
    "Tax Code",
    "Tax Amount",
    "Exchange Rate",
    "Extra Reference",
    "Project Ref",
  ];

  // Build CSV rows — one row per invoice line
  const rows: string[][] = [];

  // Use company name as account ref (first 8 chars, uppercase, no spaces)
  const accountRef = invoice.company.name
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 8)
    .toUpperCase();

  for (const line of invoice.lines) {
    rows.push([
      "SI", // Sales Invoice
      accountRef,
      "4000", // Default sales nominal code
      "0",
      formatSageDate(invoice.periodEnd),
      invoice.invoiceNumber,
      line.description,
      line.amount.toFixed(2),
      "T1", // Standard UK VAT
      ((line.amount * invoice.vatRate) / 100).toFixed(2),
      "1.00",
      invoice.poNumber || "",
      "", // Project ref
    ]);
  }

  // Append credit note rows (Sage Sales Credit) for Issued/Processed credit
  // notes against this invoice only — Draft credit notes aren't confirmed
  // yet and stay out of the export. Sage convention keeps SC amounts
  // positive (no negative-amount rows).
  const creditNotes = await prisma.creditNote.findMany({
    where: { invoiceId: invoice.id, status: { in: ["Issued", "Processed"] } },
    orderBy: { creditNoteNumber: "asc" },
  });

  for (const creditNote of creditNotes) {
    rows.push([
      "SC", // Sales Credit
      accountRef,
      "4000",
      "0",
      formatSageDate(creditNote.processedAt || creditNote.createdAt),
      creditNote.creditNoteNumber,
      creditNote.reason,
      creditNote.amount.toFixed(2),
      "T1",
      creditNote.vatAmount.toFixed(2),
      "1.00",
      invoice.poNumber || "",
      "",
    ]);
  }

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\r\n");

  // Return as downloadable CSV
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sage-${invoice.invoiceNumber}.csv"`,
    },
  });
}
