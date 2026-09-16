import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function maskValue(val: string | null | undefined, showLast = 3): string {
  if (!val) return "—";
  if (val.length <= showLast) return "•".repeat(val.length);
  return "•".repeat(val.length - showLast) + val.slice(-showLast);
}

export async function GET(request: NextRequest) {
  try {
    const guard = await requireStaff();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.reason === "forbidden" ? "Forbidden" : "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { session } = guard;

    const contractorId = request.nextUrl.searchParams.get("contractorId");
    if (!contractorId) {
      return NextResponse.json({ error: "Missing contractorId" }, { status: 400 });
    }

    const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    const [assignments, timesheets, compliances, documents, contractorLogin] = await Promise.all([
      prisma.assignment.findMany({ where: { contractorId }, include: { company: { select: { name: true } } } }),
      prisma.timesheet.findMany({ where: { contractorId }, include: { entries: true } }),
      prisma.complianceRecord.findMany({ where: { contractorId } }),
      prisma.document.findMany({ where: { contractorId }, select: { type: true, fileName: true, version: true, createdAt: true } }),
      prisma.contractorLogin.findUnique({ where: { contractorId }, select: { email: true, lastLoginAt: true, createdAt: true } }),
    ]);

    // Build PDF
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const blue = rgb(0, 0.37, 0.55); // #005F8C
    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);
    const pageWidth = 595; // A4
    const pageHeight = 842;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    function newPage() {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      // Header on each page
      page.drawText("PRL Site Solutions — Subject Access Request", { x: margin, y, size: 8, font, color: gray });
      y -= 25;
    }

    function checkSpace(needed: number) {
      if (y - needed < margin + 20) newPage();
    }

    function drawTitle(text: string) {
      checkSpace(30);
      page.drawText(text, { x: margin, y, size: 14, font: fontBold, color: blue });
      y -= 6;
      page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: blue });
      y -= 18;
    }

    function drawField(label: string, value: string) {
      checkSpace(18);
      page.drawText(label + ":", { x: margin, y, size: 8, font: fontBold, color: gray });
      const valText = (value || "—").substring(0, 80);
      page.drawText(valText, { x: margin + 140, y, size: 9, font, color: black });
      y -= 16;
    }

    function drawRow(cols: string[], widths: number[], bold = false) {
      checkSpace(16);
      let x = margin;
      for (let i = 0; i < cols.length; i++) {
        const text = (cols[i] || "—").substring(0, Math.floor(widths[i] / 4));
        page.drawText(text, { x, y, size: 7.5, font: bold ? fontBold : font, color: bold ? gray : black });
        x += widths[i];
      }
      y -= 14;
    }

    // ── Cover ──
    page.drawText("PRL SITE SOLUTIONS", { x: margin, y, size: 20, font: fontBold, color: blue });
    y -= 25;
    page.drawText("Subject Access Request — Data Export", { x: margin, y, size: 14, font: fontBold, color: black });
    y -= 18;
    page.drawText("GDPR Article 15 — Right of Access", { x: margin, y, size: 10, font, color: gray });
    y -= 14;
    page.drawText(`Generated: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, { x: margin, y, size: 9, font, color: gray });
    y -= 14;
    page.drawText("Classification: Confidential — Personal Data", { x: margin, y, size: 9, font: fontBold, color: rgb(0.8, 0, 0) });
    y -= 30;

    // ── Personal Details ──
    drawTitle("1. Personal Information");
    drawField("Full Name", `${contractor.firstName} ${contractor.lastName}`);
    drawField("Email", contractor.email);
    drawField("Phone", contractor.phone || "—");
    drawField("Job Title", contractor.jobTitle || "—");
    drawField("Date of Birth", contractor.dateOfBirth ? formatDate(contractor.dateOfBirth) : "—");
    drawField("Address", contractor.address || "—");
    drawField("Postcode", contractor.postcode || "—");
    drawField("Status", contractor.status);
    drawField("IR35 Status", contractor.ir35Status || "—");
    drawField("NI Number", maskValue(contractor.niNumber));
    drawField("UTR Number", maskValue(contractor.utrNumber));
    y -= 10;

    // ── Emergency Contact ──
    drawTitle("2. Emergency Contact");
    drawField("Name", contractor.emergencyContactName || "—");
    drawField("Phone", contractor.emergencyContactPhone || "—");
    drawField("Relationship", contractor.emergencyContactRelation || "—");
    y -= 10;

    // ── Financial ──
    drawTitle("3. Financial Information");
    drawField("Day Rate", contractor.dayRate ? `£${contractor.dayRate}` : "—");
    drawField("Pay Rate/hr", contractor.payRate ? `£${contractor.payRate}` : "—");
    drawField("Charge Rate/hr", contractor.chargeRate ? `£${contractor.chargeRate}` : "—");
    y -= 10;

    // ── Account ──
    drawTitle("4. Account Information");
    drawField("Login Email", contractorLogin?.email || "—");
    drawField("Last Login", contractorLogin?.lastLoginAt ? formatDate(contractorLogin.lastLoginAt) : "Never");
    drawField("Account Created", contractorLogin?.createdAt ? formatDate(contractorLogin.createdAt) : "—");
    drawField("Record Created", formatDate(contractor.createdAt));
    drawField("Last Updated", formatDate(contractor.updatedAt));
    y -= 10;

    // ── Assignments ──
    drawTitle("5. Assignments");
    if (assignments.length === 0) {
      page.drawText("No assignments on record.", { x: margin, y, size: 9, font, color: gray });
      y -= 16;
    } else {
      drawRow(["Company", "Role", "Start", "End", "Status"], [130, 120, 80, 80, 80], true);
      for (const a of assignments) {
        drawRow([a.company.name, a.role, formatDate(a.startDate), a.endDate ? formatDate(a.endDate) : "Ongoing", a.status], [130, 120, 80, 80, 80]);
      }
    }
    y -= 10;

    // ── Timesheets ──
    drawTitle("6. Timesheets");
    if (timesheets.length === 0) {
      page.drawText("No timesheets on record.", { x: margin, y, size: 9, font, color: gray });
      y -= 16;
    } else {
      drawRow(["Week Starting", "Total Hours", "Overtime", "Status", "Submitted"], [120, 80, 80, 80, 120], true);
      for (const ts of timesheets) {
        drawRow([formatDate(ts.weekStarting), `${ts.totalHours}h`, `${ts.overtimeHours}h`, ts.status, ts.submittedAt ? formatDate(ts.submittedAt) : "—"], [120, 80, 80, 80, 120]);
      }
    }
    y -= 10;

    // ── Compliance ──
    drawTitle("7. Compliance Records");
    if (compliances.length === 0) {
      page.drawText("No compliance records on file.", { x: margin, y, size: 9, font, color: gray });
      y -= 16;
    } else {
      drawRow(["Type", "Reference", "Status", "Issue Date", "Expiry Date"], [120, 100, 80, 90, 90], true);
      for (const c of compliances) {
        drawRow([c.type, c.reference || "—", c.status, c.issueDate ? formatDate(c.issueDate) : "—", c.expiryDate ? formatDate(c.expiryDate) : "—"], [120, 100, 80, 90, 90]);
      }
    }
    y -= 10;

    // ── Documents ──
    drawTitle("8. Uploaded Documents");
    if (documents.length === 0) {
      page.drawText("No documents uploaded.", { x: margin, y, size: 9, font, color: gray });
      y -= 16;
    } else {
      drawRow(["Type", "File Name", "Version", "Uploaded"], [80, 220, 60, 120], true);
      for (const d of documents) {
        drawRow([d.type, d.fileName, `v${d.version}`, formatDate(d.createdAt)], [80, 220, 60, 120]);
      }
    }
    y -= 10;

    // ── Footer ──
    checkSpace(60);
    y -= 20;
    page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.5, color: gray });
    y -= 15;
    page.drawText("This document contains all personal data held by PRL Site Solutions for the above individual.", { x: margin, y, size: 8, font, color: gray });
    y -= 12;
    page.drawText("Generated in compliance with UK GDPR Article 15 — Right of Access.", { x: margin, y, size: 8, font, color: gray });
    y -= 12;
    page.drawText("PRL Site Solutions Ltd | info@prlsitesolutions.co.uk | 0800 772 3959", { x: margin, y, size: 8, font, color: gray });

    // Serialize
    const pdfBytes = await pdf.save();
    const contractorName = `${contractor.firstName}-${contractor.lastName}`.replace(/[^a-zA-Z0-9-]/g, "");
    const dateStr = new Date().toISOString().split("T")[0];

    // Log
    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: "Exported SAR PDF",
        entityType: "Contractor",
        entityId: contractorId,
        details: `Subject Access Request PDF export for ${contractor.firstName} ${contractor.lastName}`,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SAR-${contractorName}-${dateStr}.pdf"`,
      },
    });
  } catch (error) {
    console.error("SAR PDF export error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
