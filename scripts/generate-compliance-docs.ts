/**
 * Generates three compliance Word documents for PRL Site Solutions:
 * 1. Corporate Criminal Offence Policy Statement
 * 2. RAMS – Modern Slavery
 * 3. RAMS – Corporate Criminal Offence
 *
 * Run: npx tsx scripts/generate-compliance-docs.ts
 */

import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
  Header,
  PageNumber,
  NumberFormat,
} from "docx";
import fs from "fs";
import path from "path";

const COMPANY = "PRL Site Solutions Ltd";
const DATE = "19 May 2026";
const REVIEW = "May 2027";
const OUT_DIR = path.join(process.cwd(), "docs");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function heading1(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
  });
}

function heading2(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
  });
}

function body(text: string, bold = false) {
  return new Paragraph({
    children: [new TextRun({ text, bold, size: 22 })],
    spacing: { after: 120 },
  });
}

function bullet(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function spacer() {
  return new Paragraph({ text: "", spacing: { after: 160 } });
}

function titleBlock(title: string, ref: string, version: string) {
  return [
    new Paragraph({
      children: [new TextRun({ text: COMPANY, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32, color: "1F3864" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Document Ref: ${ref}  |  Version: ${version}  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`, size: 18, color: "666666" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
    }),
  ];
}

function tableRow(label: string, value: string, header = false) {
  const shade = header ? { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" } : undefined;
  const textColor = header ? "FFFFFF" : "000000";
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: textColor })] })],
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: shade,
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: textColor })] })],
        width: { size: 75, type: WidthType.PERCENTAGE },
        shading: shade,
      }),
    ],
  });
}

function infoTable(rows: [string, string][]) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v]) => tableRow(l, v)),
  });
}

// ─── RAMs helper ─────────────────────────────────────────────────────────────

interface RamsRow {
  activity: string;
  hazard: string;
  who: string;
  likelihood: string;
  severity: string;
  rating: string;
  controls: string;
  residual: string;
}

function ramsTable(rows: RamsRow[]) {
  const headers = ["Activity", "Hazard / Risk", "Who Affected", "Likelihood\n(1–5)", "Severity\n(1–5)", "Risk Rating", "Control Measures", "Residual Risk"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })],
        shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
        width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE },
      })
    ),
  });

  const dataRows = rows.map((r) =>
    new TableRow({
      children: [
        r.activity, r.hazard, r.who, r.likelihood, r.severity, r.rating, r.controls, r.residual,
      ].map((val) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: val, size: 18 })] })],
        })
      ),
    })
  );

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ─── Doc 1: CCO Policy ───────────────────────────────────────────────────────

async function makeCCOPolicy() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Corporate Criminal Offence Policy Statement", "PRL-POL-CCO-001", "1.0"),

        heading1("1. Purpose"),
        body(
          `${COMPANY} is committed to the prevention of tax evasion and the facilitation of tax evasion by associated persons, as required under Part 3 of the Criminal Finances Act 2017 (the Act). This statement sets out the company's position and the policies that collectively satisfy the requirements of the Act.`
        ),
        spacer(),

        heading1("2. Scope"),
        body("This policy applies to all employees, contractors, agency workers, directors, and any third parties acting on behalf of PRL Site Solutions Ltd."),
        spacer(),

        heading1("3. Policy Position"),
        body(
          "PRL Site Solutions Ltd does not maintain a separate standalone Corporate Criminal Offence policy. Instead, the requirements of the Criminal Finances Act 2017 are addressed through the following existing policies, which together provide comprehensive coverage of all required elements:"
        ),
        bullet("Anti-Bribery and Anti-Corruption Policy — prohibits facilitation payments and corrupt conduct by associated persons"),
        bullet("Whistleblowing Policy — provides a confidential mechanism for reporting suspected tax evasion or other financial misconduct"),
        bullet("Code of Conduct — sets behavioural standards for all staff and associated persons"),
        bullet("Supply Chain Due Diligence Procedures — controls applied to subcontractors and labour providers to mitigate facilitation risk"),
        spacer(),

        heading1("4. Prevention Procedures"),
        body("The following reasonable prevention procedures are in place:"),
        bullet("Risk assessment of associated persons, including contractors and payment intermediaries, conducted at onboarding"),
        bullet("Contractual obligations requiring compliance with all relevant tax legislation imposed on suppliers and subcontractors"),
        bullet("Staff training on the requirements of the Criminal Finances Act 2017 included in induction and annual compliance refresher"),
        bullet("Clear escalation path for reporting suspected tax evasion: line manager → Director → external legal counsel"),
        bullet("No tolerance for facilitation of tax evasion, regardless of commercial benefit"),
        spacer(),

        heading1("5. Responsibilities"),
        infoTable([
          ["Director", "Overall accountability for compliance with the Criminal Finances Act 2017"],
          ["Office Manager", "Maintenance of this policy statement and related procedures"],
          ["All Staff", "Compliance with this policy and immediate reporting of any concerns"],
          ["HR / Compliance", "Training delivery and supply chain due diligence oversight"],
        ]),
        spacer(),

        heading1("6. Reporting"),
        body(
          "Any employee, contractor, or associated person who suspects facilitation of tax evasion must report this immediately via the Whistleblowing Policy. Reports can be made anonymously. There will be no retaliation against anyone who raises a concern in good faith."
        ),
        spacer(),

        heading1("7. Consequences of Breach"),
        body(
          "Breach of this policy by an employee will result in disciplinary action up to and including dismissal. Breach by a contractor or associated person will result in immediate termination of contract and, where appropriate, referral to HMRC or other relevant authorities."
        ),
        spacer(),

        heading1("8. Review"),
        body(`This policy statement will be reviewed annually or following any material change to the Criminal Finances Act 2017 or associated HMRC guidance. Next review: ${REVIEW}.`),
        spacer(),

        heading1("9. Approval"),
        infoTable([
          ["Approved by", "Director, PRL Site Solutions Ltd"],
          ["Date", DATE],
          ["Version", "1.0"],
          ["Document Ref", "PRL-POL-CCO-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-CCO-Policy-Statement.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

// ─── Doc 2: RAMS Modern Slavery ──────────────────────────────────────────────

async function makeRAMSModernSlavery() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Risk Assessment — Modern Slavery", "PRL-RAMS-MS-001", "1.0"),

        heading1("1. Document Information"),
        infoTable([
          ["Company", COMPANY],
          ["Activity", "Recruitment, contractor management, supply chain operations"],
          ["Legislation", "Modern Slavery Act 2015"],
          ["Assessor", "Director / Compliance Lead"],
          ["Date of Assessment", DATE],
          ["Review Date", REVIEW],
        ]),
        spacer(),

        heading1("2. Purpose"),
        body(
          "This risk assessment identifies the potential risks of modern slavery, forced labour, and human trafficking within PRL Site Solutions Ltd's operations and supply chain, and sets out the control measures in place to mitigate those risks."
        ),
        spacer(),

        heading1("3. Risk Rating Key"),
        body("Risk Rating = Likelihood (1–5) × Severity (1–5)"),
        bullet("1–8: Low — monitor"),
        bullet("9–15: Medium — additional controls required"),
        bullet("16–25: High — immediate action required"),
        spacer(),

        heading1("4. Risk Assessment Matrix"),
        ramsTable([
          {
            activity: "Contractor recruitment",
            hazard: "Workers recruited under false pretences or debt bondage",
            who: "Contractors / Agency workers",
            likelihood: "2",
            severity: "5",
            rating: "10 – Medium",
            controls: "Right to work checks; ID verification; workers paid directly to personal accounts; no third-party payment deductions; PRISM onboarding captures worker consent",
            residual: "4 – Low",
          },
          {
            activity: "Supply chain / subcontractors",
            hazard: "Labour provider using coerced or trafficked workers",
            who: "Subcontractor workforce",
            likelihood: "2",
            severity: "5",
            rating: "10 – Medium",
            controls: "Supplier due diligence questionnaire; contractual anti-slavery clauses; audit rights reserved; preference for accredited labour providers",
            residual: "4 – Low",
          },
          {
            activity: "Accommodation / transport",
            hazard: "Workers housed in controlled/coercive conditions by a third party",
            who: "Contractors",
            likelihood: "1",
            severity: "5",
            rating: "5 – Low",
            controls: "Workers are self-sourcing; company does not arrange accommodation; welfare checks available via site managers",
            residual: "2 – Low",
          },
          {
            activity: "Payroll / umbrella companies",
            hazard: "Wage deductions, withholding of pay, or financial control by intermediary",
            who: "Contractors",
            likelihood: "2",
            severity: "4",
            rating: "8 – Low",
            controls: "Workers select their own payment method; PRISM records payment queries; timesheet approval requires worker sign-off; complaints escalation in place",
            residual: "2 – Low",
          },
          {
            activity: "Site operations",
            hazard: "Signs of exploitation observed on client sites not reported",
            who: "All workers on site",
            likelihood: "2",
            severity: "4",
            rating: "8 – Low",
            controls: "Staff trained to recognise indicators of modern slavery; clear reporting path to management; Gangmasters and Labour Abuse Authority (GLAA) referral route documented",
            residual: "2 – Low",
          },
        ]),
        spacer(),

        heading1("5. Control Measures Summary"),
        bullet("Right to work checks and identity verification for all workers prior to placement"),
        bullet("Workers paid directly to personal bank accounts; no deductions without written consent"),
        bullet("Modern Slavery Act compliance clause included in all supplier and subcontractor contracts"),
        bullet("Annual Modern Slavery Statement published on company website"),
        bullet("Staff training: recognising signs of exploitation included in induction and annual refresher"),
        bullet("Anonymous reporting available via Whistleblowing Policy"),
        bullet("GLAA referral process documented and available to all staff"),
        spacer(),

        heading1("6. Review"),
        body(`This risk assessment will be reviewed annually or following any significant change in operations, supply chain, or legislation. Next review: ${REVIEW}.`),

        heading1("7. Sign-off"),
        infoTable([
          ["Assessed by", "Director, PRL Site Solutions Ltd"],
          ["Date", DATE],
          ["Document Ref", "PRL-RAMS-MS-001"],
          ["Version", "1.0"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-RAMS-Modern-Slavery.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

// ─── Doc 3: RAMS Corporate Criminal Offence ──────────────────────────────────

async function makeRAMSCCO() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Risk Assessment — Corporate Criminal Offence", "PRL-RAMS-CCO-001", "1.0"),

        heading1("1. Document Information"),
        infoTable([
          ["Company", COMPANY],
          ["Activity", "Financial operations, contractor payments, tax compliance, supply chain management"],
          ["Legislation", "Criminal Finances Act 2017 (Part 3)"],
          ["Assessor", "Director / Compliance Lead"],
          ["Date of Assessment", DATE],
          ["Review Date", REVIEW],
        ]),
        spacer(),

        heading1("2. Purpose"),
        body(
          "This risk assessment identifies the risks of PRL Site Solutions Ltd or its associated persons facilitating tax evasion, as defined under Part 3 of the Criminal Finances Act 2017, and sets out the prevention procedures and controls in place."
        ),
        spacer(),

        heading1("3. Risk Rating Key"),
        body("Risk Rating = Likelihood (1–5) × Severity (1–5)"),
        bullet("1–8: Low — monitor"),
        bullet("9–15: Medium — additional controls required"),
        bullet("16–25: High — immediate action required"),
        spacer(),

        heading1("4. Risk Assessment Matrix"),
        ramsTable([
          {
            activity: "Contractor payroll",
            hazard: "Contractor operating outside IR35; company facilitates false employment status declaration",
            who: "Contractors / HMRC",
            likelihood: "2",
            severity: "5",
            rating: "10 – Medium",
            controls: "IR35 status determined at engagement; HMRC CEST tool used; contractual terms reflect actual working arrangements; records retained in PRISM",
            residual: "4 – Low",
          },
          {
            activity: "Cash-in-hand payments",
            hazard: "Payments made in cash enabling tax evasion by workers",
            who: "Workers / HMRC",
            likelihood: "1",
            severity: "5",
            rating: "5 – Low",
            controls: "All payments made via bank transfer only; no cash payments policy in place; PRISM records all transactions",
            residual: "1 – Low",
          },
          {
            activity: "Supply chain — labour providers",
            hazard: "Labour provider engaged by PRL fails to declare worker income / operates fraudulent payroll",
            who: "Supply chain / HMRC",
            likelihood: "2",
            severity: "4",
            rating: "8 – Low",
            controls: "Supplier due diligence includes confirmation of PAYE/payroll compliance; contractual anti-facilitation clause; preference for accredited or GLAA-licensed providers",
            residual: "2 – Low",
          },
          {
            activity: "Umbrella company usage",
            hazard: "Umbrella company used by contractors facilitates tax avoidance schemes",
            who: "Contractors / HMRC",
            likelihood: "2",
            severity: "4",
            rating: "8 – Low",
            controls: "Contractors informed of risks of non-compliant umbrella schemes; HMRC's managed service company rules communicated; only compliant payment vehicles accepted",
            residual: "2 – Low",
          },
          {
            activity: "Client billing / invoicing",
            hazard: "False invoicing or inflated billing to conceal income",
            who: "Clients / HMRC",
            likelihood: "1",
            severity: "5",
            rating: "5 – Low",
            controls: "Invoices reconciled against timesheets; external accountant reviews quarterly; segregation of duties between operations and finance",
            residual: "1 – Low",
          },
          {
            activity: "Staff / director conduct",
            hazard: "Employee or director acts dishonestly to facilitate another person's tax evasion",
            who: "HMRC / third parties",
            likelihood: "1",
            severity: "5",
            rating: "5 – Low",
            controls: "Annual compliance training for all staff; Code of Conduct signed by all employees; Whistleblowing Policy provides anonymous reporting route; zero-tolerance policy enforced",
            residual: "1 – Low",
          },
        ]),
        spacer(),

        heading1("5. Prevention Procedures"),
        bullet("All contractor payments made via bank transfer to personal accounts — no cash payments"),
        bullet("IR35 status assessed at point of engagement using HMRC CEST tool; records stored in PRISM"),
        bullet("Anti-facilitation clause included in all supplier and subcontractor contracts"),
        bullet("Annual staff training covering Criminal Finances Act 2017 requirements"),
        bullet("Whistleblowing Policy provides a confidential route for reporting suspected tax evasion"),
        bullet("Quarterly finance review by external accountant; invoice reconciliation against timesheets"),
        bullet("Contractors advised against use of non-compliant umbrella or mini-umbrella schemes"),
        spacer(),

        heading1("6. Review"),
        body(`This risk assessment will be reviewed annually or following any material change in legislation, HMRC guidance, or company operations. Next review: ${REVIEW}.`),

        heading1("7. Sign-off"),
        infoTable([
          ["Assessed by", "Director, PRL Site Solutions Ltd"],
          ["Date", DATE],
          ["Document Ref", "PRL-RAMS-CCO-001"],
          ["Version", "1.0"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-RAMS-Corporate-Criminal-Offence.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

// ─── Run all ──────────────────────────────────────────────────────────────────

async function main() {
  await makeCCOPolicy();
  await makeRAMSModernSlavery();
  await makeRAMSCCO();
  console.log(`\n📁 All documents saved to: ${OUT_DIR}`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
