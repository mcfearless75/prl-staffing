import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  rawName: string;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const nameIdx = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
  const emailIdx = headers.findIndex((h) => h === "email" || h === "email address");
  if (nameIdx === -1 || emailIdx === -1) return [];
  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const rawName = vals[nameIdx] || "";
    const email = (vals[emailIdx] || "").toLowerCase().trim();
    if (!rawName || !email) continue;
    rows.push({ ...splitName(rawName), email, rawName });
  }
  return rows;
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(buffer) as any);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1).values as (string | null | undefined)[];
  const headers = headerRow.map((h) => (h || "").toString().toLowerCase().trim());
  const nameIdx = headers.findIndex((h) => h === "name" || h === "full name" || h === "fullname");
  const emailIdx = headers.findIndex((h) => h === "email" || h === "email address");
  if (nameIdx === -1 || emailIdx === -1) return [];

  const rows: ParsedRow[] = [];
  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const vals = row.values as (string | null | undefined)[];
    const rawName = (vals[nameIdx] || "").toString().trim();
    const email = (vals[emailIdx] || "").toString().toLowerCase().trim();
    if (!rawName || !email) return;
    rows.push({ ...splitName(rawName), email, rawName });
  });
  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const previewOnly = formData.get("preview") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();
    let rows: ParsedRow[] = [];

    if (fileName.endsWith(".csv")) {
      const text = new TextDecoder().decode(buffer);
      rows = parseCSV(text);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      rows = await parseExcel(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type. Upload a .csv or .xlsx file." }, { status: 400 });
    }

    if (rows.length === 0) {
      return NextResponse.json({
        error: "No valid rows found. Make sure the file has 'Name' and 'Email' columns.",
      }, { status: 400 });
    }

    // Preview mode — just return parsed rows
    if (previewOnly) {
      return NextResponse.json({ rows, total: rows.length });
    }

    // Import mode
    const created: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const existing = await prisma.contractor.findUnique({
          where: { email: row.email },
          select: { id: true },
        });
        if (existing) {
          skipped.push(`${row.rawName} <${row.email}> — already exists`);
          continue;
        }
        await prisma.contractor.create({
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            status: "New",
          },
        });
        await prisma.activityLog.create({
          data: {
            userId: (session.user as { id?: string }).id,
            userName: session.user.name,
            userEmail: session.user.email,
            action: "Imported Contractor",
            entityType: "Contractor",
            details: `Bulk import: ${row.firstName} ${row.lastName} <${row.email}>`,
          },
        });
        created.push(`${row.rawName} <${row.email}>`);
      } catch (err) {
        errors.push(`${row.rawName} <${row.email}>: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({ created: created.length, skipped: skipped.length, errors: errors.length, skippedList: skipped, errorList: errors });
  } catch (err) {
    return NextResponse.json({ error: `Import failed: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
