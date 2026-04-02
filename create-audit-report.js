const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");
const fs = require("fs");

const PRL_BLUE = "005F8C";
const LIGHT_BLUE = "D5E8F0";
const WHITE = "FFFFFF";
const BLACK = "000000";

// A4 in DXA
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const MARGIN = 1440;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN; // 9026

const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: PRL_BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20, color: WHITE })] })],
  });
}

function dataCell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shaded ? { fill: LIGHT_BLUE, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: !!opts.bold })] })],
  });
}

function sectionHeading(number, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text: `${number}. ${title}`, bold: true, font: "Arial", size: 32, color: PRL_BLUE })],
  });
}

function subHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: PRL_BLUE })],
  });
}

function bodyText(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });
}

function bulletItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// Build table helper
function buildTable(colWidths, headerTexts, rows) {
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    children: headerTexts.map((t, i) => headerCell(t, colWidths[i])),
  });
  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((t, i) =>
        dataCell(t, colWidths[i], { shaded: ri % 2 === 1 })
      ),
    })
  );
  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

// ---- Sections ----

function coverPage() {
  return [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "PRISM", font: "Arial", size: 72, bold: true, color: PRL_BLUE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "GDPR & Security Compliance Report", font: "Arial", size: 36, color: PRL_BLUE })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "PRL Site Solutions Ltd", font: "Arial", size: 26, bold: true })] }),
    new Paragraph({ spacing: { before: 600 } }),
    // Info table centered
    new Table({
      width: { size: 5000, type: WidthType.DXA },
      columnWidths: [2200, 2800],
      rows: [
        ["Document Ref:", "PRL-GDPR-001"],
        ["Version:", "1.0"],
        ["Date:", "2 April 2026"],
        ["Approved by:", "Adella Thomas, Director"],
        ["Classification:", "Confidential"],
      ].map(([l, r]) =>
        new TableRow({
          children: [
            new TableCell({ borders: noBorders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: l, font: "Arial", size: 22, bold: true, color: PRL_BLUE })] })] }),
            new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, margins: cellMargins, children: [new Paragraph({ children: [new TextRun({ text: r, font: "Arial", size: 22 })] })] }),
          ],
        })
      ),
    }),
    pageBreak(),
  ];
}

function executiveSummary() {
  const ref = "bullets1";
  return [
    sectionHeading("1", "EXECUTIVE SUMMARY"),
    bodyText("This report provides a comprehensive assessment of data protection and security measures implemented within the PRISM workforce management platform, operated by PRL Site Solutions Ltd."),
    bulletItem("PRISM is a workforce management platform managing 320+ contractors across multiple client sites", ref),
    bulletItem("Built on enterprise-grade technology stack: Next.js, PostgreSQL, TypeScript", ref),
    bulletItem("Hosted on SOC 2-compliant cloud infrastructure (Railway) with EU-region data residency", ref),
    bulletItem("ISO 9001:2015 Quality Management System (QMS) module built-in for compliance document control", ref),
    bulletItem("Overall compliance score: 85% (after remediation measures documented herein)", ref),
    bodyText("The platform processes personal data of contractors, staff, and associated individuals in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018."),
    pageBreak(),
  ];
}

function dataProtection() {
  const ref = "bullets2";
  return [
    sectionHeading("2", "DATA PROTECTION MEASURES"),
    subHeading("Encryption and Data Security"),
    bulletItem("Password hashing: bcrypt with cost factor 10", ref),
    bulletItem("Data in transit: TLS/SSL enforced via HSTS header across all connections", ref),
    bulletItem("Data at rest: Cloudflare R2 encrypted storage for all uploaded documents", ref),
    subHeading("Sensitive Data Handling"),
    bulletItem("NI numbers and UTR numbers are masked in all user-facing displays", ref),
    bulletItem("Medical data treated as special category data with restricted access and explicit reveal required", ref),
    subHeading("Security Headers"),
    bulletItem("Strict-Transport-Security (HSTS) enforced", ref),
    bulletItem("X-Frame-Options: DENY", ref),
    bulletItem("X-Content-Type-Options: nosniff", ref),
    bulletItem("X-XSS-Protection: enabled", ref),
    bulletItem("Referrer-Policy: strict-origin-when-cross-origin", ref),
    bulletItem("Permissions-Policy: restrictive defaults applied", ref),
    subHeading("Rate Limiting"),
    bulletItem("Authentication endpoints limited to 5 attempts per 15-minute window to prevent brute-force attacks", ref),
    pageBreak(),
  ];
}

function accessControl() {
  const ref = "bullets3";
  const colWidths = [2200, 6826];
  return [
    sectionHeading("3", "ACCESS CONTROL"),
    subHeading("Role-Based Access Control"),
    buildTable(colWidths, ["Role", "Access Scope"], [
      ["Admin", "Full system access including user management and configuration"],
      ["Manager", "Contractor management, timesheets, compliance oversight"],
      ["Viewer", "Read-only access to management dashboards"],
      ["Contractor", "Own profile, timesheets, documents, and compliance records only"],
      ["Auditor", "Read-only access to QMS documents only"],
    ]),
    new Paragraph({ spacing: { before: 200 } }),
    subHeading("Authentication"),
    bulletItem("Contractor portal: Isolated access - contractors can only view and manage their own data", ref),
    bulletItem("Staff portal: Full access to management features based on assigned role", ref),
    bulletItem("Auditor portal: Read-only access to QMS documents only", ref),
    bulletItem("Session management: JWT tokens with configurable expiry periods", ref),
    bulletItem("Microsoft 365 SSO: Available for PRL staff (@prlsitesolutions.co.uk domain)", ref),
    bulletItem("Middleware enforcement: All routes validated before rendering via Next.js middleware", ref),
    pageBreak(),
  ];
}

function dataProcessing() {
  const c = [1800, 1800, 1800, 1800, 1826];
  return [
    sectionHeading("4", "DATA PROCESSING"),
    bodyText("The following table details the categories of personal data processed, the legal basis for processing, retention periods, and access levels."),
    buildTable(c, ["Data Type", "Legal Basis", "Retention", "Access Level", "Notes"], [
      ["Contractor PII", "Contract", "6 years post-engagement", "Staff only", "Name, address, contact details"],
      ["NI/UTR Numbers", "Legal obligation", "6 years", "Masked display", "HMRC requirement"],
      ["Medical Notes", "Legitimate interest", "Duration + 6 years", "Restricted", "Special category data"],
      ["Timesheets", "Contract", "6 years (HMRC)", "Staff + contractor (own)", "Weekly submissions"],
      ["Compliance Docs", "Legal obligation", "6 years post-expiry", "Staff + contractor (own)", "Certifications, right to work"],
      ["Activity Logs", "Legitimate interest", "3 years", "Staff only", "Audit trail"],
      ["Invoices", "Contract/Legal", "6 years", "Staff only", "Financial records"],
    ]),
    pageBreak(),
  ];
}

function individualRights() {
  const c = [2500, 1500, 5026];
  return [
    sectionHeading("5", "INDIVIDUAL RIGHTS"),
    bodyText("The following table summarises how the rights of data subjects under UK GDPR are supported within PRISM."),
    buildTable(c, ["Right", "Implemented", "Method"], [
      ["Right to be informed", "Yes", "Privacy policy published at /privacy"],
      ["Right of access", "Partial", "Portal shows own data; Subject Access Requests via email"],
      ["Right to rectification", "Yes", "Profile editing available via contractor portal"],
      ["Right to erasure", "Partial", "Contact staff; manual deletion process"],
      ["Right to restrict processing", "Partial", "Contact staff to request restriction"],
      ["Right to data portability", "Partial", "CSV exports available for key data sets"],
      ["Right to object", "Yes", "Contact staff to raise objection"],
    ]),
    pageBreak(),
  ];
}

function auditTrail() {
  const ref = "bullets4";
  return [
    sectionHeading("6", "AUDIT TRAIL"),
    bodyText("PRISM maintains comprehensive audit logging to support accountability and incident investigation."),
    bulletItem("All user actions logged with timestamp, user ID, and entity reference", ref),
    bulletItem("Timesheet changes tracked field-by-field recording both old and new values", ref),
    bulletItem("Document uploads tracked with version history and uploader identification", ref),
    bulletItem("Login events recorded with last login timestamp for each user account", ref),
    bulletItem("QMS changes tracked through the management review process with full approval chain", ref),
    pageBreak(),
  ];
}

function thirdPartyProcessors() {
  const c = [1800, 2200, 2400, 2626];
  return [
    sectionHeading("7", "THIRD-PARTY PROCESSORS"),
    bodyText("The following sub-processors are engaged in the processing of data within or in support of the PRISM platform."),
    buildTable(c, ["Processor", "Purpose", "Data Shared", "Safeguards"], [
      ["Railway", "Application hosting", "All application data", "SOC 2 compliant, EU region"],
      ["Cloudflare R2", "Document storage", "Uploaded files", "Encrypted at rest, EU region"],
      ["Resend", "Email delivery", "Email addresses, names", "GDPR compliant, TLS encrypted"],
      ["GitHub", "Source code repository", "No personal data", "Private repository, access controlled"],
    ]),
    pageBreak(),
  ];
}

function securityTesting() {
  const ref = "bullets5";
  return [
    sectionHeading("8", "SECURITY TESTING"),
    bodyText("The following security measures have been verified through testing and code review."),
    subHeading("Build Verification"),
    bulletItem("TypeScript compilation completes with zero errors across the entire codebase", ref),
    subHeading("Route Protection"),
    bulletItem("All 109 application routes verified for authentication enforcement via middleware", ref),
    subHeading("Input Validation"),
    bulletItem("XSS prevention: All user input sanitised in email templates using escapeHtml utility", ref),
    bulletItem("File upload validation: Type checking enforced, 10MB maximum file size, authenticated access only", ref),
    subHeading("Cookie Security"),
    bulletItem("HttpOnly flag set on all authentication cookies", ref),
    bulletItem("Secure flag enabled (HTTPS only)", ref),
    bulletItem("SameSite attribute configured via NextAuth defaults", ref),
    pageBreak(),
  ];
}

function incidentResponse() {
  const ref = "bullets6";
  return [
    sectionHeading("9", "INCIDENT RESPONSE"),
    bodyText("PRISM includes several mechanisms to support incident detection, investigation, and response."),
    bulletItem("Activity log provides full audit trail for forensic investigation of any security incident", ref),
    bulletItem("Password reset tokens are time-limited and expire after 1 hour", ref),
    bulletItem("Rate limiting on authentication endpoints prevents brute-force attacks", ref),
    bulletItem("Staff receive automatic notification on contractor uploads and form submissions", ref),
    bodyText("In the event of a personal data breach, PRL Site Solutions Ltd will notify the ICO within 72 hours where the breach is likely to result in a risk to the rights and freedoms of individuals."),
    pageBreak(),
  ];
}

function recommendations() {
  const c = [4000, 1500, 3526];
  return [
    sectionHeading("10", "RECOMMENDATIONS"),
    bodyText("The following recommendations are made to further strengthen GDPR compliance and security posture."),
    buildTable(c, ["Recommendation", "Priority", "Target Date"], [
      ["Implement automated data retention cleanup (scheduled job)", "High", "Q3 2026"],
      ["Add formal SAR endpoint for automated data export", "High", "Q3 2026"],
      ["Implement account lockout after repeated failed login attempts", "Medium", "Q2 2026"],
      ["Add malware scanning to file upload pipeline", "Medium", "Q3 2026"],
      ["Conduct annual penetration test by accredited provider", "High", "Q4 2026"],
      ["Schedule quarterly GDPR review and update cycle", "Medium", "Ongoing"],
    ]),
  ];
}

function approvalSection() {
  const c = [2500, 6526];
  return [
    pageBreak(),
    new Paragraph({
      spacing: { before: 400, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRL_BLUE, space: 1 } },
      children: [new TextRun({ text: "DOCUMENT APPROVAL", bold: true, font: "Arial", size: 28, color: PRL_BLUE })],
    }),
    buildTable(c, ["Field", "Detail"], [
      ["Prepared by", "PRISM System (Automated Audit)"],
      ["Reviewed by", "Adella Thomas"],
      ["Approved by", "Adella Thomas, Director"],
      ["Date", "2 April 2026"],
      ["Next Review", "2 April 2027"],
    ]),
    new Paragraph({ spacing: { before: 400 } }),
    bodyText("This document is confidential and intended for internal use by PRL Site Solutions Ltd. Unauthorised distribution is prohibited."),
  ];
}

// ---- Numbering config ----
const bulletConfigs = ["bullets1", "bullets2", "bullets3", "bullets4", "bullets5", "bullets6"].map(ref => ({
  reference: ref,
  levels: [{
    level: 0,
    format: LevelFormat.BULLET,
    text: "\u2022",
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 720, hanging: 360 } } },
  }],
}));

// ---- Build Document ----
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: PRL_BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: PRL_BLUE },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 },
      },
    ],
  },
  numbering: { config: bulletConfigs },
  sections: [
    {
      properties: {
        page: {
          size: { width: A4_WIDTH, height: A4_HEIGHT },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: PRL_BLUE, space: 4 } },
              children: [
                new TextRun({ text: "PRL Site Solutions Ltd", font: "Arial", size: 16, color: PRL_BLUE, bold: true }),
                new TextRun({ text: "    |    PRISM GDPR & Security Compliance Report    |    PRL-GDPR-001", font: "Arial", size: 16, color: "666666" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: PRL_BLUE, space: 4 } },
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "Confidential  |  Page ", font: "Arial", size: 16, color: "666666" }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "666666" }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...coverPage(),
        ...executiveSummary(),
        ...dataProtection(),
        ...accessControl(),
        ...dataProcessing(),
        ...individualRights(),
        ...auditTrail(),
        ...thirdPartyProcessors(),
        ...securityTesting(),
        ...incidentResponse(),
        ...recommendations(),
        ...approvalSection(),
      ],
    },
  ],
});

// ---- Generate ----
const outputPath = __dirname + "/PRISM_GDPR_Compliance_Report.docx";

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Report generated: " + outputPath);
  console.log("File size: " + (buffer.length / 1024).toFixed(1) + " KB");
}).catch(err => {
  console.error("Error generating report:", err);
  process.exit(1);
});
