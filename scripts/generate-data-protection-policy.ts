/**
 * Generates PRL Site Solutions Data Protection Policy (Word document)
 * Run: npx tsx scripts/generate-data-protection-policy.ts
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
  ShadingType,
  TableLayoutType,
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
function body(text: string, bold = false) {
  return new Paragraph({ children: [new TextRun({ text, bold, size: 22 })], spacing: { after: 120 } });
}
function bullet(text: string) {
  return new Paragraph({ children: [new TextRun({ text, size: 22 })], bullet: { level: 0 }, spacing: { after: 80 } });
}
function spacer() {
  return new Paragraph({ text: "", spacing: { after: 160 } });
}

function titleBlock() {
  return [
    new Paragraph({
      children: [new TextRun({ text: COMPANY, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Data Protection Policy", bold: true, size: 36, color: "1F3864" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Document Ref: PRL-POL-DP-001  |  Version: 2.0  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`,
        size: 18, color: "666666",
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
    }),
  ];
}

function infoTable(rows: [string, string][]) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { fill: "E8EEF7", type: ShadingType.CLEAR, color: "auto" },
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
            width: { size: 70, type: WidthType.PERCENTAGE },
          }),
        ],
      })
    ),
  });
}

function lawfulBasisTable() {
  const headers = ["Category of Data", "Purpose", "Lawful Basis"];
  const rows = [
    ["Name, address, contact details", "Contractor onboarding and payroll administration", "Contract performance (Art. 6(1)(b))"],
    ["Right to work documents, ID", "Legal obligation — right to work verification", "Legal obligation (Art. 6(1)(c))"],
    ["National Insurance number, tax status", "Payroll and HMRC reporting", "Legal obligation (Art. 6(1)(c))"],
    ["Bank account details", "Wage payment", "Contract performance (Art. 6(1)(b))"],
    ["Certifications, training records", "Compliance and site safety verification", "Legitimate interests (Art. 6(1)(f))"],
    ["Health information (e.g. fitness to work)", "Site safety and duty of care", "Vital interests / employment law (Art. 9(2)(b))"],
    ["Criminal record checks (where required)", "Safe recruitment", "Legal obligation / substantial public interest (Art. 9(2)(g))"],
    ["Timesheets, work history", "Payroll, client invoicing, dispute resolution", "Contract performance (Art. 6(1)(b))"],
    ["CCTV images (client sites)", "Site security — processed by client", "Legitimate interests (Art. 6(1)(f))"],
    ["Email and communication records", "Business administration", "Legitimate interests (Art. 6(1)(f))"],
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })],
      shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
      width: { size: Math.floor(100 / 3), type: WidthType.PERCENTAGE },
    })),
  });

  const dataRows = rows.map(r => new TableRow({
    children: r.map(v => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })],
    })),
  }));

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

async function makeDataProtectionPolicy() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock(),

        h1("1. Introduction"),
        body(`${COMPANY} is committed to protecting the personal data of its employees, contractors, clients, and other individuals with whom it interacts. This policy sets out how the company collects, uses, stores, and protects personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.`),
        spacer(),

        h1("2. Scope"),
        body("This policy applies to:"),
        bullet("All employees, permanent and temporary"),
        bullet("Contractors and agency workers engaged by PRL Site Solutions Ltd"),
        bullet("Directors and company officers"),
        bullet("Any third party processing data on behalf of the company"),
        body("It covers all personal data held in any format — digital, paper, or otherwise."),
        spacer(),

        h1("3. Data Controller"),
        infoTable([
          ["Data Controller", COMPANY],
          ["Registered Address", "15 Beryl Road, Prenton, Wirral, CH43 9RS"],
          ["ICO Registration", "Registered with the Information Commissioner's Office (ICO)"],
          ["Data Protection Lead", "Director, PRL Site Solutions Ltd"],
          ["Contact", "info@prlsitesolutions.co.uk"],
        ]),
        spacer(),

        h1("4. Key Definitions"),
        body("Personal data: any information relating to an identified or identifiable living individual."),
        body("Special category data: data revealing racial or ethnic origin, political opinions, religious beliefs, health, sex life, sexual orientation, biometric or genetic data, or criminal convictions."),
        body("Processing: any operation performed on personal data, including collection, storage, use, disclosure, or deletion."),
        body("Data subject: the individual to whom the personal data relates."),
        spacer(),

        h1("5. Data Protection Principles"),
        body("PRL Site Solutions Ltd processes personal data in accordance with the six UK GDPR principles:"),
        bullet("Lawfulness, fairness and transparency — data is processed lawfully and individuals are informed"),
        bullet("Purpose limitation — data is collected for specified, explicit, and legitimate purposes only"),
        bullet("Data minimisation — only data that is necessary for the stated purpose is collected"),
        bullet("Accuracy — data is kept accurate and up to date"),
        bullet("Storage limitation — data is retained only as long as necessary"),
        bullet("Integrity and confidentiality — data is protected against unauthorised access, loss, or destruction"),
        spacer(),

        h1("6. Lawful Basis for Processing"),
        body("The table below sets out the categories of personal data processed, the purpose, and the lawful basis under UK GDPR:"),
        spacer(),
        lawfulBasisTable(),
        spacer(),

        h1("7. Special Category Data"),
        body("Where the company processes special category data (e.g. health information for fitness-to-work purposes), it does so under Article 9(2) of the UK GDPR, specifically:"),
        bullet("Article 9(2)(b) — processing necessary for employment law obligations"),
        bullet("Article 9(2)(g) — processing necessary for substantial public interest under Schedule 1 of the Data Protection Act 2018"),
        body("Special category data is subject to enhanced security controls and access restrictions."),
        spacer(),

        h1("8. Data Collection"),
        body("Personal data is collected directly from data subjects at the point of engagement (application, onboarding) and from third parties where permitted, including:"),
        bullet("Reference agencies and previous employers"),
        bullet("Government databases (e.g. HMRC, DWP) where legally authorised"),
        bullet("Client companies in respect of site access requirements"),
        body("Individuals are provided with a Privacy Notice at the point of data collection explaining how their data will be used."),
        spacer(),

        h1("9. Data Retention"),
        infoTable([
          ["Employee / contractor records", "7 years after end of engagement (HMRC requirement)"],
          ["Payroll records", "7 years from end of tax year"],
          ["Right to work documents", "Duration of employment + 2 years"],
          ["Accident / incident records", "3 years minimum (RIDDOR); indefinitely where serious injury"],
          ["Job application records (unsuccessful)", "6 months after decision"],
          ["CCTV footage (where company holds)", "31 days unless subject to investigation"],
          ["Email correspondence", "3 years (business record)"],
        ]),
        body("Data held beyond retention periods is securely deleted or anonymised."),
        spacer(),

        h1("10. Data Sharing"),
        body("Personal data may be shared with third parties only where:"),
        bullet("The data subject has given consent"),
        bullet("Sharing is necessary for the performance of a contract"),
        bullet("There is a legal obligation to disclose (e.g. HMRC, pension providers, HSE)"),
        bullet("There is a legitimate interest that is not overridden by the data subject's rights"),
        body("Third parties with whom data is shared include:"),
        bullet("HMRC — payroll and tax reporting"),
        bullet("Pension providers — auto-enrolment obligations"),
        bullet("Clients — name, qualifications, certifications required for site access"),
        bullet("PRISM Workforce Management Platform — secure digital management of worker records"),
        bullet("Accountants / payroll processors — under Data Processing Agreements"),
        body("The company does not sell personal data to any third party."),
        spacer(),

        h1("11. International Transfers"),
        body("PRL Site Solutions Ltd does not routinely transfer personal data outside the United Kingdom. Where any transfer is necessary, it will be made only in accordance with UK GDPR transfer mechanisms, including adequacy decisions or Standard Contractual Clauses."),
        spacer(),

        h1("12. Data Security"),
        body("The company implements appropriate technical and organisational measures to protect personal data, including:"),
        bullet("Access controls — personal data accessible only to those with a legitimate need"),
        bullet("Password protection and multi-factor authentication on systems holding personal data"),
        bullet("Encrypted storage for digital records containing special category data"),
        bullet("Secure disposal of paper records (cross-cut shredding)"),
        bullet("PRISM platform — ISO 27001-aligned controls, role-based access, audit logging"),
        bullet("Staff training on data protection and information security at induction and annually"),
        spacer(),

        h1("13. Data Subject Rights"),
        body("Under UK GDPR, individuals have the following rights:"),
        infoTable([
          ["Right of access", "Request a copy of personal data held (Subject Access Request — respond within 1 month)"],
          ["Right to rectification", "Request correction of inaccurate or incomplete data"],
          ["Right to erasure", "Request deletion where data is no longer necessary or consent is withdrawn (subject to legal retention obligations)"],
          ["Right to restrict processing", "Request restriction of processing in certain circumstances"],
          ["Right to data portability", "Receive personal data in a structured, machine-readable format where processing is based on consent or contract"],
          ["Right to object", "Object to processing based on legitimate interests or for direct marketing"],
          ["Rights re automated decisions", "Not to be subject to solely automated decisions with significant effects"],
        ]),
        body("Requests should be made in writing to: info@prlsitesolutions.co.uk. The company will respond within one calendar month."),
        spacer(),

        h1("14. Data Breach Procedure"),
        body("In the event of a personal data breach, the company will:"),
        bullet("Contain the breach immediately and assess the risk to individuals"),
        bullet("Notify the ICO within 72 hours if the breach is likely to result in a risk to individuals' rights and freedoms"),
        bullet("Notify affected data subjects without undue delay where the breach is likely to result in a high risk to their rights and freedoms"),
        bullet("Document all breaches, regardless of whether notification is required"),
        body("The Data Protection Lead is responsible for managing breach responses. Contact: info@prlsitesolutions.co.uk"),
        spacer(),

        h1("15. Privacy by Design"),
        body("The company embeds data protection into the design of new processes, systems, and services from the outset. Data Protection Impact Assessments (DPIAs) are conducted where processing is likely to result in a high risk to individuals."),
        spacer(),

        h1("16. Responsibilities"),
        infoTable([
          ["Director", "Ultimate accountability for data protection compliance"],
          ["Data Protection Lead", "Day-to-day management of this policy; breach response; SAR handling"],
          ["All staff", "Compliance with this policy; reporting suspected breaches immediately"],
          ["IT / System Administrators", "Maintaining technical security controls"],
          ["Third-party processors", "Compliance with Data Processing Agreements"],
        ]),
        spacer(),

        h1("17. Training"),
        body("All staff receive data protection training at induction. Annual refresher training is mandatory. Training records are maintained by HR."),
        spacer(),

        h1("18. Complaints"),
        body("Data subjects who believe their data protection rights have been infringed may complain to:"),
        bullet(`${COMPANY} — info@prlsitesolutions.co.uk`),
        bullet("Information Commissioner's Office (ICO) — www.ico.org.uk | 0303 123 1113"),
        spacer(),

        h1("19. Related Policies"),
        bullet("Whistleblowing Policy"),
        bullet("Anti-Bribery and Anti-Corruption Policy"),
        bullet("Information Security Policy"),
        bullet("Modern Slavery Policy Statement"),
        bullet("PRISM Platform Privacy Notice"),
        spacer(),

        h1("20. Policy Review"),
        body(`This policy is reviewed annually or following any material change to data protection legislation, ICO guidance, or company operations. Next review: ${REVIEW}.`),
        spacer(),

        h1("21. Approval"),
        infoTable([
          ["Approved by", `Director, ${COMPANY}`],
          ["Date", DATE],
          ["Version", "2.0"],
          ["Document Ref", "PRL-POL-DP-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-Data-Protection-Policy.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

makeDataProtectionPolicy().catch(e => { console.error("❌", e); process.exit(1); });
