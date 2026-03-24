import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Sage 50 / Sage 200 compatible CSV export
 * Format follows Sage import specifications for sales invoices
 * Columns: Type, Account Ref, Nominal A/C, Date, Invoice No, Net Amount, Tax Code, Tax Amount, Description
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
