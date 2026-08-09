/**
 * Generates three KID variants for PRL Site Solutions:
 * 1. KID — CIS / PSC Outside IR35
 * 2. KID — Umbrella Company
 * 3. KID — Agency PAYE
 *
 * Each includes a mandatory illustrative example statement (HMRC requirement).
 * Run: npx tsx scripts/generate-kid-v2.ts
 */

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, TableLayoutType,
} from "docx";
import fs from "fs";
import path from "path";

const COMPANY = "PRL Site Solutions Ltd";
const DATE = "19 May 2026";
const REVIEW = "May 2027";
const OUT_DIR = path.join(process.cwd(), "docs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function h1(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 160 } });
}
function h2(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}
function body(text: string, bold = false, color = "000000") {
  return new Paragraph({ children: [new TextRun({ text, bold, size: 22, color })], spacing: { after: 120 } });
}
function bullet(text: string) {
  return new Paragraph({ children: [new TextRun({ text, size: 22 })], bullet: { level: 0 }, spacing: { after: 80 } });
}
function spacer() { return new Paragraph({ text: "", spacing: { after: 160 } }); }

function titleBlock(title: string, variant: string, ref: string) {
  return [
    new Paragraph({ children: [new TextRun({ text: COMPANY, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: "Key Information Document", bold: true, size: 36, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: variant, bold: true, size: 26, color: "C55A11" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({
      children: [new TextRun({ text: `Ref: ${ref}  |  Version: 2.0  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`, size: 18, color: "666666" })],
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "IMPORTANT: This document must be provided to the worker before they agree to an engagement. A new KID must be issued if any pay element changes.", size: 20, italics: true, color: "C00000" })],
      spacing: { after: 300 },
    }),
  ];
}

function infoRow(label: string, value: string, fillLabel = "E8EEF7") {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { fill: fillLabel, type: ShadingType.CLEAR, color: "auto" },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: value.startsWith("[") ? "C00000" : "000000" })] })],
        width: { size: 60, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

function tbl(rows: [string, string][]) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v]) => infoRow(l, v)),
  });
}

function exampleRow(label: string, value: string, bold = false, color = "000000", fillLabel = "F2F2F2") {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold, size: 20, color })] })],
        width: { size: 65, type: WidthType.PERCENTAGE },
        shading: { fill: fillLabel, type: ShadingType.CLEAR, color: "auto" },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, bold, size: 20, color })] })],
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: bold ? "E8EEF7" : "FFFFFF", type: ShadingType.CLEAR, color: "auto" },
      }),
    ],
  });
}

function signatureBlock() {
  return [
    new Paragraph({ children: [new TextRun({ text: "Worker Acknowledgement", bold: true, size: 24 })], spacing: { before: 320, after: 120 } }),
    body("By signing below I confirm I have received and read this Key Information Document before agreeing to work through PRL Site Solutions Ltd."),
    spacer(),
    tbl([
      ["Worker Full Name (print)", ""],
      ["Worker Signature", ""],
      ["Date", ""],
      ["PRL Representative", ""],
      ["PRL Signature", ""],
      ["Date Issued", ""],
    ]),
  ];
}

function commonSections() {
  return [
    h1("Section 1 — About PRL Site Solutions Ltd"),
    tbl([
      ["Company Name", COMPANY],
      ["Type of Business", "Employment Business — supplying temporary workers"],
      ["Address", "15 Beryl Road, Prenton, Wirral, CH43 9RS"],
      ["Telephone", "0800 772 3959"],
      ["Email", "info@prlsitesolutions.co.uk"],
      ["Compliance Portal", "www.prismworkforce.online"],
    ]),
    spacer(),

    h1("Section 2 — Worker and Assignment Details"),
    tbl([
      ["Worker Name", "[Worker full name]"],
      ["Date of Issue", "[Date]"],
      ["Role / Job Title", "[e.g. Electrician / Labourer / Plant Operator]"],
      ["Client / Hirer", "[Client company name]"],
      ["Site Address", "[Site address]"],
      ["Start Date", "[Date]"],
      ["Expected Duration", "[Date or 'Ongoing — subject to client requirements']"],
      ["Minimum Hours Guaranteed", "None — assignments offered as available"],
    ]),
    spacer(),
  ];
}

function payAndHolidaySections() {
  return [
    h1("Section 5 — Pay Frequency and Method"),
    tbl([
      ["Pay Frequency", "Weekly — every Friday for the preceding week worked"],
      ["Payment Method", "BACS bank transfer to your personal or company account"],
      ["Timesheet Deadline", "Timesheets must be submitted and approved via PRISM by [day/time] each week"],
    ]),
    spacer(),

    h1("Section 6 — Holiday Entitlement"),
    tbl([
      ["Statutory Entitlement", "5.6 weeks per year (28 days), pro-rated"],
      ["Method", "Holiday pay is paid when holiday is taken — not rolled up into the hourly rate"],
      ["How to Request", "Contact your PRL representative to book holiday"],
    ]),
    spacer(),

    h1("Section 7 — Agency Workers Regulations 2010"),
    body("From day one you have the right to access the hirer's collective facilities (canteen, car parking) and be notified of job vacancies. After 12 continuous weeks in the same role with the same hirer, you will be entitled to equal pay and working conditions as a comparable direct employee. PRL will notify you when you are approaching this threshold."),
    spacer(),

    h1("Section 8 — When a New KID Will Be Issued"),
    bullet("When you are placed in a new assignment or your engagement method changes"),
    bullet("If your pay rate changes (a new KID is best practice)"),
    bullet("If any new deduction is added or removed (e.g. student loan, pension change)"),
    bullet("If your umbrella company or payment vehicle changes"),
    spacer(),

    h1("Section 9 — Contact and Complaints"),
    tbl([
      ["General Enquiries", "info@prlsitesolutions.co.uk | 0800 772 3959"],
      ["Pay Queries", "www.prismworkforce.online/payment-query"],
      ["Complaints", "Director — info@prlsitesolutions.co.uk"],
      ["ACAS (independent advice)", "0300 123 1100"],
    ]),
    spacer(),
  ];
}

// ─── KID 1: CIS / PSC Outside IR35 ──────────────────────────────────────────

async function makeKID_CIS() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Key Information Document", "Engagement Type: CIS / PSC Outside IR35", "PRL-KID-CIS-001"),
        ...commonSections(),

        h1("Section 3 — Pay Rate and Deductions"),
        tbl([
          ["Gross Assignment Rate", "[£ per hour] — paid to your limited company or sole trader account"],
          ["IR35 Status", "Outside IR35 — determined by PRL at point of engagement"],
          ["CIS Deduction", "20% CIS deduction withheld and paid to HMRC on your behalf (or 30% if unverified)"],
          ["How CIS Deduction Works", "PRL deducts 20% from your gross payment and pays this to HMRC. You can offset this against your tax liability in your Self Assessment return."],
          ["National Insurance", "Your responsibility as a self-employed individual"],
          ["Pension", "Your responsibility — PRL does not contribute"],
          ["Any Other Deductions", "None — PRL makes no further deductions without your written consent"],
        ]),
        spacer(),

        h1("Section 4 — Illustrative Example Statement"),
        body("The following is a worked example to illustrate how your take-home pay is calculated under CIS. This uses representative figures — your actual pay will depend on your agreed rate and hours worked.", false, "444444"),
        spacer(),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            exampleRow("Illustrative example based on:", "40 hrs @ £20.00/hr", true, "1F3864", "D9E2F3"),
            exampleRow("Gross Assignment Pay (40 hrs × £20.00)", "£800.00"),
            exampleRow("Less: CIS Deduction @ 20%", "– £160.00"),
            exampleRow("NET PAYMENT TO COMPANY / SOLE TRADER", "£640.00", true, "1F3864"),
            exampleRow("Note: You remain responsible for Income Tax and NI via Self Assessment. The £160 CIS deduction is offset against your overall tax liability — it is not an additional tax.", "", false, "666666"),
          ],
        }),
        spacer(),

        ...payAndHolidaySections(),
        ...signatureBlock(),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-KID-CIS-Outside-IR35.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

// ─── KID 2: Umbrella Company ─────────────────────────────────────────────────

async function makeKID_Umbrella() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Key Information Document", "Engagement Type: Umbrella Company", "PRL-KID-UMB-001"),
        ...commonSections(),

        h1("Section 3 — Pay Rate and Deductions"),
        tbl([
          ["Gross Assignment Rate (paid to Umbrella)", "[£ per hour] — this is the rate PRL pays to your umbrella company"],
          ["Umbrella Company Name", "[Name of umbrella company chosen by worker]"],
          ["Umbrella Margin", "[£ per week / stated by umbrella company] — deducted by umbrella before net pay is calculated"],
          ["Employer's National Insurance", "Deducted by umbrella company from the assignment rate before calculating your gross salary"],
          ["Employee's National Insurance", "Deducted at source from your gross salary by the umbrella company"],
          ["Income Tax (PAYE)", "Deducted at source from your gross salary by the umbrella company"],
          ["Apprenticeship Levy", "0.5% of payroll — deducted by umbrella company"],
          ["Holiday Pay", "Accrued and paid by umbrella company — confirm rolled-up or paid-when-taken with your umbrella"],
          ["Pension (Auto-enrolment)", "If eligible, your umbrella company will auto-enrol you. Employee and employer contributions apply."],
          ["Other Deductions", "Student loan, salary sacrifice — only if applicable to you. None made by PRL."],
          ["PRL Deductions", "None — PRL makes no deductions. All deductions are made by your umbrella company."],
        ]),
        body("IMPORTANT: The umbrella company's margin and employment costs are deducted from the assignment rate before your gross salary is calculated. Your take-home pay will be lower than the assignment rate.", true, "C00000"),
        spacer(),

        h1("Section 4 — Illustrative Example Statement"),
        body("The following worked example shows how umbrella deductions affect your take-home pay. These are representative figures based on a standard week. Your actual pay depends on your agreed rate, hours worked, tax code, and umbrella company margin.", false, "444444"),
        spacer(),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            exampleRow("Illustrative example based on:", "40 hrs @ £20.00/hr", true, "1F3864", "D9E2F3"),
            exampleRow("Gross Assignment Rate (40 hrs × £20.00)", "£800.00"),
            exampleRow("Less: Employer's NI (13.8% on earnings above threshold, ~£95)", "– £95.00"),
            exampleRow("Less: Apprenticeship Levy (0.5%)", "– £4.00"),
            exampleRow("Less: Umbrella Margin (illustrative)", "– £25.00"),
            exampleRow("= Worker Gross Salary", "£676.00"),
            exampleRow("Less: Employee's NI (approx. 8% on earnings above threshold)", "– £45.00"),
            exampleRow("Less: Income Tax (20% basic rate, after personal allowance)", "– £75.00"),
            exampleRow("ESTIMATED NET TAKE-HOME PAY", "£556.00", true, "1F3864"),
            exampleRow("Holiday pay (if accrued separately @ 12.07%): ~£82/week", "", false, "666666"),
            exampleRow("Note: These figures are illustrative only. Your actual take-home will vary depending on your tax code, pension contributions, student loan status, and the umbrella company's exact margin. Request a personalised illustration from your umbrella company.", "", false, "666666"),
          ],
        }),
        spacer(),

        ...payAndHolidaySections(),
        ...signatureBlock(),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-KID-Umbrella-Company.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

// ─── KID 3: Agency PAYE ──────────────────────────────────────────────────────

async function makeKID_PAYE() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Key Information Document", "Engagement Type: Agency PAYE", "PRL-KID-PAYE-001"),
        ...commonSections(),

        h1("Section 3 — Pay Rate and Deductions"),
        tbl([
          ["Gross Hourly Rate", "[£ per hour]"],
          ["Statutory Deductions", "Income Tax (PAYE) and National Insurance — deducted at source by PRL Site Solutions Ltd as your employer"],
          ["Tax Code", "Your tax code as notified by HMRC — contact HMRC if you believe your code is incorrect"],
          ["Pension (Auto-enrolment)", "If you meet the eligibility criteria, PRL Site Solutions Ltd will auto-enrol you into a workplace pension. Employee contribution: 5%. Employer contribution: 3%."],
          ["Student Loan", "Deducted at source if applicable and notified by HMRC"],
          ["Other Deductions", "None without your written consent"],
        ]),
        spacer(),

        h1("Section 4 — Illustrative Example Statement"),
        body("The following worked example shows how PAYE deductions affect your take-home pay. These are representative figures. Your actual pay will depend on your tax code, NI category, and any other deductions that apply to you.", false, "444444"),
        spacer(),
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            exampleRow("Illustrative example based on:", "40 hrs @ £14.00/hr", true, "1F3864", "D9E2F3"),
            exampleRow("Gross Pay (40 hrs × £14.00)", "£560.00"),
            exampleRow("Less: Income Tax (20% basic rate, after personal allowance)", "– £32.00"),
            exampleRow("Less: Employee's NI (8% on earnings above threshold)", "– £25.00"),
            exampleRow("NET TAKE-HOME PAY", "£503.00", true, "1F3864"),
            exampleRow("Employer's NI (paid by PRL, not deducted from your pay): ~£40", "", false, "666666"),
            exampleRow("Note: These figures are illustrative only and assume a standard 1257L tax code and no student loan. Your actual take-home will vary based on your personal tax position.", "", false, "666666"),
          ],
        }),
        spacer(),

        ...payAndHolidaySections(),
        ...signatureBlock(),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-KID-Agency-PAYE.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  await makeKID_CIS();
  await makeKID_Umbrella();
  await makeKID_PAYE();
  console.log(`\n📁 All KID documents saved to: ${OUT_DIR}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
