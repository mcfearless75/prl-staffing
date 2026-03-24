const docx = require("docx");
const fs = require("fs");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  PageBreak,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  LevelFormat,
  TableOfContents,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
  PageOrientation,
} = docx;

// --- Constants ---
const PRL_BLUE = "005F8C";
const FONT = "Arial";
const PAGE_WIDTH = 11906; // A4 width in twips
const PAGE_HEIGHT = 16838; // A4 height in twips

// --- Helpers ---
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        font: FONT,
        bold: true,
        color: PRL_BLUE,
        size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 26 : 22,
      }),
    ],
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        font: FONT,
        size: opts.size || 22,
        bold: opts.bold || false,
        color: opts.color || "000000",
        italics: opts.italics || false,
      }),
    ],
  });
}

function bulletItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullet-list", level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function numberedItem(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbered-list", level },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 22 })],
  });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
};

function headerCell(text, width) {
  return new TableCell({
    borders: cellBorders,
    shading: { type: ShadingType.SOLID, color: PRL_BLUE },
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, font: FONT, size: 20, bold: true, color: "FFFFFF" })],
      }),
    ],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 30, after: 30 },
        children: [
          new TextRun({
            text: text || "",
            font: FONT,
            size: opts.size || 20,
            bold: opts.bold || false,
            color: opts.color || "000000",
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => headerCell(h, colWidths ? colWidths[i] : undefined)),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map((c, i) => cell(c, { width: colWidths ? colWidths[i] : undefined })),
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function fieldBlock(label, lines = 3) {
  const children = [
    new Paragraph({
      spacing: { before: 120, after: 40 },
      children: [new TextRun({ text: label, font: FONT, size: 22, bold: true, color: PRL_BLUE })],
    }),
  ];
  for (let i = 0; i < lines; i++) {
    children.push(
      new Paragraph({
        spacing: { after: 20 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
        children: [new TextRun({ text: " ", font: FONT, size: 22 })],
      })
    );
  }
  return children;
}

function flowStep(step) {
  return para(`    [${step}]`, { size: 22 });
}

function flowArrow() {
  return para("            |", { size: 22 });
}

function flowDown() {
  return para("            v", { size: 22 });
}

// ============================================================
// SECTION BUILDERS
// ============================================================

function coverPage() {
  return [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "PRL SITE SOLUTIONS", font: FONT, size: 56, bold: true, color: PRL_BLUE }),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "ISO 9001:2015", font: FONT, size: 44, bold: true, color: PRL_BLUE }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Quality Management System",
          font: FONT,
          size: 40,
          color: PRL_BLUE,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Document Pack",
          font: FONT,
          size: 36,
          color: PRL_BLUE,
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 600 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "Version 1.0  |  March 2026", font: FONT, size: 24, color: "666666" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "Approved by: Adella Thomas, Managing Director",
          font: FONT,
          size: 24,
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: "CONTROLLED DOCUMENT — UNAUTHORISED COPYING PROHIBITED",
          font: FONT,
          size: 18,
          bold: true,
          color: "CC0000",
        }),
      ],
    }),
    pageBreakPara(),
  ];
}

// 1. Quality Policy
function section1() {
  return [
    heading("1. QUALITY POLICY (ISO 9001:2015 Clause 5.2)"),
    para("Document Reference: PRL-QMS-POL-001  |  Version: 1.0  |  Date: March 2026", { size: 20, color: "666666" }),
    para("Approved by: Adella Thomas, Managing Director", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Policy Statement", HeadingLevel.HEADING_2),
    para("PRL Site Solutions is committed to providing high-quality temporary and contract staffing solutions for the construction, industrial, and commercial sectors. Our Quality Management System is designed to ensure consistent service delivery, regulatory compliance, and continual improvement."),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Our Commitments", HeadingLevel.HEADING_2),
    numberedItem("Deliver recruitment and workforce management services that consistently meet client requirements and applicable statutory and regulatory obligations."),
    numberedItem("Ensure all contractors are competent, compliant, and properly vetted before placement through rigorous onboarding processes managed via PRISM software."),
    numberedItem("Maintain a culture of continual improvement by setting measurable quality objectives and regularly reviewing our performance."),
    numberedItem("Engage with interested parties — including clients, contractors, suppliers, and regulatory bodies — to understand and fulfil their needs and expectations."),
    numberedItem("Apply risk-based thinking across all processes to prevent nonconformities and seize opportunities for improvement."),
    numberedItem("Provide adequate resources, training, and support to all staff so they can contribute effectively to the QMS."),
    numberedItem("Comply with all relevant legislation including the Employment Agencies Act 1973, Conduct of Employment Agencies and Employment Businesses Regulations 2003, and all applicable health and safety legislation."),
    new Paragraph({ spacing: { after: 80 } }),
    para("This policy is communicated to all employees and contractors, is available to relevant interested parties, and is reviewed at least annually to ensure its continuing suitability."),
    new Paragraph({ spacing: { after: 80 } }),
    para("Signed: ____________________________          Date: ____________________"),
    para("Adella Thomas, Managing Director", { bold: true }),
    pageBreakPara(),
  ];
}

// 2. Quality Manual
function section2() {
  return [
    heading("2. QUALITY MANUAL (ISO 9001:2015 Clauses 4–10)"),
    para("Document Reference: PRL-QMS-MAN-001  |  Version: 1.0  |  Date: March 2026", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Clause 4 — Context of the Organisation", HeadingLevel.HEADING_2),
    para("PRL Site Solutions operates within the UK temporary and contract recruitment sector, primarily serving construction, industrial, and commercial clients. We use PRISM, our proprietary workforce management software, as the central platform for managing contractor records, compliance, timesheets, and client interactions. External and internal issues, along with the needs of interested parties, are documented and reviewed annually."),
    heading("Clause 5 — Leadership", HeadingLevel.HEADING_2),
    para("Top management, led by the Managing Director, demonstrates leadership and commitment by establishing the Quality Policy, assigning QMS roles and responsibilities, and ensuring resources are available. The Quality Policy is communicated throughout the organisation and to relevant interested parties."),
    heading("Clause 6 — Planning", HeadingLevel.HEADING_2),
    para("Risks and opportunities are identified and addressed through the Risk Register. Quality objectives are established at relevant functions and levels, and are measurable, monitored, and aligned with the Quality Policy. Planning of changes follows a structured approach."),
    heading("Clause 7 — Support", HeadingLevel.HEADING_2),
    para("Resources including people, infrastructure (PRISM platform, offices, IT systems), and the working environment are determined and provided. Competence is managed through the Training Matrix. Documented information is controlled per the Document Control Register. PRISM serves as the primary document and record repository."),
    heading("Clause 8 — Operation", HeadingLevel.HEADING_2),
    para("Operational processes — contractor onboarding, compliance management, timesheet and billing, client fulfilment — are planned and controlled. Process maps define each key workflow. PRISM automates compliance checks, document expiry tracking, and timesheet approval. Nonconforming outputs are controlled and documented."),
    heading("Clause 9 — Performance Evaluation", HeadingLevel.HEADING_2),
    para("Customer satisfaction is monitored through feedback forms. Internal audits are conducted per the annual Internal Audit Schedule. Management reviews are held at least quarterly using the defined agenda and minutes template. Key performance indicators are tracked in PRISM dashboards."),
    heading("Clause 10 — Improvement", HeadingLevel.HEADING_2),
    para("Nonconformities and corrective actions are managed through the NCR/CAPA process. Continual improvement opportunities are logged and tracked. The organisation uses data from audits, customer feedback, process metrics, and management reviews to drive improvement."),
    pageBreakPara(),
  ];
}

// 3. Scope Statement
function section3() {
  return [
    heading("3. SCOPE STATEMENT (ISO 9001:2015 Clause 4.3)"),
    para("Document Reference: PRL-QMS-SCP-001  |  Version: 1.0  |  Date: March 2026", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Scope of the Quality Management System", HeadingLevel.HEADING_2),
    para("The provision of temporary and contract staffing solutions for the construction, industrial, and commercial sectors, including contractor recruitment, onboarding, compliance management, timesheet processing, and client workforce fulfilment, delivered through the PRISM workforce management platform.", { bold: true }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Applicability of ISO 9001:2015 Requirements", HeadingLevel.HEADING_2),
    para("All requirements of ISO 9001:2015 are applicable to PRL Site Solutions. No clauses have been excluded."),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Boundaries and Applicability", HeadingLevel.HEADING_2),
    bulletItem("Geographic: United Kingdom"),
    bulletItem("Sites: Head office and all client site locations where PRL contractors are deployed"),
    bulletItem("Processes: Contractor sourcing, vetting, onboarding, compliance, placement, timesheet management, billing, and client relationship management"),
    bulletItem("Technology: PRISM workforce management software platform"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Exclusions", HeadingLevel.HEADING_2),
    para("None. All clauses of ISO 9001:2015 are applicable."),
    pageBreakPara(),
  ];
}

// 4. Quality Objectives
function section4() {
  return [
    heading("4. QUALITY OBJECTIVES (ISO 9001:2015 Clause 6.2)"),
    para("Document Reference: PRL-QMS-OBJ-001  |  Version: 1.0  |  Date: March 2026", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Objective", "Target", "Measure", "Frequency", "Owner"],
      [
        ["Contractor compliance rate", "100% compliant before placement", "PRISM compliance dashboard", "Monthly", "Compliance Manager"],
        ["Client satisfaction score", ">= 4.2 out of 5", "Customer feedback forms", "Quarterly", "Operations Director"],
        ["Timesheet accuracy", ">= 98% first-time approval", "PRISM timesheet reports", "Monthly", "Payroll Manager"],
        ["NCR closure within target", ">= 90% closed within 30 days", "NCR/CAPA register", "Monthly", "Quality Manager"],
        ["Internal audit completion", "100% per annual schedule", "Audit completion records", "Quarterly", "Quality Manager"],
        ["Staff training compliance", "100% mandatory training current", "Training matrix review", "Quarterly", "HR Manager"],
      ],
      [25, 18, 22, 12, 15]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    para("Objectives are reviewed at each Management Review meeting and updated as necessary to reflect changing business needs and improvement opportunities."),
    pageBreakPara(),
  ];
}

// 5. NCR/CAPA Form
function section5() {
  return [
    heading("5. NONCONFORMITY & CORRECTIVE/PREVENTIVE ACTION FORM (Clause 10.2)"),
    para("Document Reference: PRL-QMS-NCR-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 60 } }),
    makeTable(
      ["Field", "Details"],
      [
        ["NCR Number", "NCR-____-____"],
        ["Date Raised", ""],
        ["Raised By", ""],
        ["Department/Process", ""],
        ["Category", "Major / Minor / Observation"],
      ],
      [30, 70]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    ...fieldBlock("Description of Nonconformity", 4),
    ...fieldBlock("Immediate/Containment Action Taken", 3),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Root Cause Analysis (5 Whys)", HeadingLevel.HEADING_2),
    ...fieldBlock("Why 1:", 1),
    ...fieldBlock("Why 2:", 1),
    ...fieldBlock("Why 3:", 1),
    ...fieldBlock("Why 4:", 1),
    ...fieldBlock("Why 5:", 1),
    ...fieldBlock("Root Cause Summary:", 2),
    new Paragraph({ spacing: { after: 80 } }),
    ...fieldBlock("Corrective Action (to eliminate the cause)", 4),
    ...fieldBlock("Preventive Action (to prevent recurrence)", 4),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Verification of Effectiveness", HeadingLevel.HEADING_2),
    makeTable(
      ["Verification Item", "Details"],
      [
        ["Verification Date", ""],
        ["Verified By", ""],
        ["Evidence of Effectiveness", ""],
        ["Effective? (Y/N)", ""],
      ],
      [35, 65]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Closure", HeadingLevel.HEADING_2),
    makeTable(
      ["Closure Item", "Details"],
      [
        ["Closed By", ""],
        ["Closure Date", ""],
        ["Quality Manager Sign-off", ""],
      ],
      [35, 65]
    ),
    pageBreakPara(),
  ];
}

// 6. Internal Audit Checklist
function section6() {
  return [
    heading("6. INTERNAL AUDIT CHECKLIST (ISO 9001:2015 Clause 9.2)"),
    para("Document Reference: PRL-QMS-AUD-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 60 } }),
    makeTable(
      ["Audit Ref", ""],
      [
        ["Audit Date", ""],
        ["Auditor", ""],
        ["Area/Process Audited", ""],
      ],
      [30, 70]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    makeTable(
      ["ISO Clause", "Requirement", "Conforms (Y/N)", "Evidence Reviewed", "Finding/Comment"],
      [
        ["4.1", "Context — internal and external issues identified", "", "", ""],
        ["4.2", "Interested parties and their requirements determined", "", "", ""],
        ["4.3", "Scope of QMS defined and documented", "", "", ""],
        ["4.4", "QMS processes and their interactions determined", "", "", ""],
        ["5.1", "Leadership and commitment demonstrated", "", "", ""],
        ["5.2", "Quality Policy established and communicated", "", "", ""],
        ["5.3", "Roles, responsibilities, and authorities assigned", "", "", ""],
        ["6.1", "Risks and opportunities addressed", "", "", ""],
        ["6.2", "Quality objectives set and planned", "", "", ""],
        ["6.3", "Changes planned in a systematic manner", "", "", ""],
        ["7.1", "Resources determined and provided", "", "", ""],
        ["7.2", "Competence of personnel ensured", "", "", ""],
        ["7.3", "Awareness of QMS maintained", "", "", ""],
        ["7.4", "Internal and external communications defined", "", "", ""],
        ["7.5", "Documented information controlled", "", "", ""],
        ["8.1", "Operational planning and control in place", "", "", ""],
        ["8.2", "Requirements for services determined", "", "", ""],
        ["8.4", "Control of externally provided processes", "", "", ""],
        ["8.5", "Service provision controlled", "", "", ""],
        ["8.7", "Nonconforming outputs controlled", "", "", ""],
        ["9.1", "Monitoring, measurement, analysis, and evaluation", "", "", ""],
        ["9.2", "Internal audit programme implemented", "", "", ""],
        ["9.3", "Management review conducted", "", "", ""],
        ["10.1", "Improvement opportunities determined", "", "", ""],
        ["10.2", "Nonconformity and corrective action process", "", "", ""],
        ["10.3", "Continual improvement activities", "", "", ""],
      ],
      [10, 30, 10, 25, 25]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    para("Auditor Signature: ____________________________    Date: ____________________"),
    pageBreakPara(),
  ];
}

// 7. Internal Audit Schedule
function section7() {
  return [
    heading("7. INTERNAL AUDIT SCHEDULE (ISO 9001:2015 Clause 9.2)"),
    para("Document Reference: PRL-QMS-AUS-001  |  Version: 1.0  |  Audit Year: 2026–2027", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Process / Area", "Q1 (Apr–Jun)", "Q2 (Jul–Sep)", "Q3 (Oct–Dec)", "Q4 (Jan–Mar)"],
      [
        ["Contractor Onboarding", "X", "", "", "X"],
        ["Compliance Management", "", "X", "", "X"],
        ["Timesheet & Billing", "", "", "X", ""],
        ["Client Fulfilment", "X", "", "", ""],
        ["Document Control", "", "X", "", ""],
        ["Training & Competence", "", "", "X", ""],
        ["Risk Management", "X", "", "", ""],
        ["Customer Feedback", "", "", "", "X"],
        ["Management Review", "", "X", "", ""],
        ["NCR/CAPA Process", "", "", "X", ""],
        ["PRISM System Controls", "X", "", "", "X"],
        ["Supplier Management", "", "X", "", ""],
      ],
      [30, 17, 17, 18, 18]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    para("Notes: Audits are scheduled based on risk, importance, and results of previous audits. The schedule is approved by the Quality Manager and reviewed at Management Review."),
    pageBreakPara(),
  ];
}

// 8. Management Review Agenda
function section8() {
  return [
    heading("8. MANAGEMENT REVIEW AGENDA (ISO 9001:2015 Clause 9.3)"),
    para("Document Reference: PRL-QMS-MRA-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Agenda Ref", ""],
      [
        ["Meeting Date", ""],
        ["Attendees", ""],
        ["Chair", "Adella Thomas, Managing Director"],
      ],
      [25, 75]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    heading("Standard Agenda Items (per Clause 9.3.2 Inputs)", HeadingLevel.HEADING_2),
    numberedItem("Status of actions from previous management reviews"),
    numberedItem("Changes in external and internal issues relevant to the QMS"),
    numberedItem("Information on quality performance and effectiveness, including:"),
    bulletItem("Customer satisfaction and feedback from interested parties", 1),
    bulletItem("Extent to which quality objectives have been met", 1),
    bulletItem("Process performance and conformity of services", 1),
    bulletItem("Nonconformities and corrective actions", 1),
    bulletItem("Monitoring and measurement results", 1),
    bulletItem("Audit results (internal and external)", 1),
    bulletItem("Performance of external providers", 1),
    numberedItem("Adequacy of resources"),
    numberedItem("Effectiveness of actions taken to address risks and opportunities"),
    numberedItem("Opportunities for improvement"),
    numberedItem("PRISM system performance and development updates"),
    numberedItem("Regulatory and legislative changes"),
    numberedItem("Any other business"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Outputs (per Clause 9.3.3)", HeadingLevel.HEADING_2),
    bulletItem("Decisions and actions related to improvement opportunities"),
    bulletItem("Any need for changes to the QMS"),
    bulletItem("Resource needs"),
    pageBreakPara(),
  ];
}

// 9. Management Review Minutes
function section9() {
  return [
    heading("9. MANAGEMENT REVIEW MINUTES (ISO 9001:2015 Clause 9.3)"),
    para("Document Reference: PRL-QMS-MRM-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Meeting Detail", "Information"],
      [
        ["Meeting Date", ""],
        ["Location", ""],
        ["Chair", ""],
        ["Attendees", ""],
        ["Apologies", ""],
      ],
      [25, 75]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    ...fieldBlock("1. Status of Actions from Previous Review", 4),
    ...fieldBlock("2. Changes in External/Internal Issues", 3),
    ...fieldBlock("3. Quality Performance Summary", 4),
    ...fieldBlock("4. Customer Satisfaction & Feedback", 3),
    ...fieldBlock("5. Audit Results", 3),
    ...fieldBlock("6. NCR/CAPA Status", 3),
    ...fieldBlock("7. Resource Adequacy", 2),
    ...fieldBlock("8. Risk and Opportunity Review", 3),
    ...fieldBlock("9. PRISM System Updates", 2),
    ...fieldBlock("10. Opportunities for Improvement", 3),
    new Paragraph({ spacing: { after: 120 } }),
    heading("Action Items", HeadingLevel.HEADING_2),
    makeTable(
      ["Action No.", "Action Description", "Owner", "Due Date", "Status"],
      [
        ["1", "", "", "", ""],
        ["2", "", "", "", ""],
        ["3", "", "", "", ""],
        ["4", "", "", "", ""],
        ["5", "", "", "", ""],
      ],
      [10, 40, 18, 15, 17]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    para("Minutes Prepared By: ____________________________    Date: ____________________"),
    para("Approved By: ____________________________    Date: ____________________"),
    pageBreakPara(),
  ];
}

// 10. Risk Register
function section10() {
  return [
    heading("10. RISK REGISTER TEMPLATE (ISO 9001:2015 Clause 6.1)"),
    para("Document Reference: PRL-QMS-RSK-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Risk Assessment Methodology", HeadingLevel.HEADING_2),
    para("Risks are assessed using a 5x5 matrix. Likelihood (1=Rare, 2=Unlikely, 3=Possible, 4=Likely, 5=Almost Certain) is multiplied by Impact (1=Negligible, 2=Minor, 3=Moderate, 4=Major, 5=Catastrophic) to give a Risk Score."),
    bulletItem("Low Risk (1–4): Monitor and review"),
    bulletItem("Medium Risk (5–9): Mitigating actions required"),
    bulletItem("High Risk (10–16): Significant action plan required"),
    bulletItem("Critical Risk (17–25): Immediate action and escalation"),
    new Paragraph({ spacing: { after: 120 } }),
    heading("Risk Register", HeadingLevel.HEADING_2),
    makeTable(
      ["Risk ID", "Risk Description", "Category", "L", "I", "Score", "Rating", "Mitigation/Control", "Owner", "Review Date", "Status"],
      [
        ["RSK-001", "", "", "", "", "", "", "", "", "", ""],
        ["RSK-002", "", "", "", "", "", "", "", "", "", ""],
        ["RSK-003", "", "", "", "", "", "", "", "", "", ""],
        ["RSK-004", "", "", "", "", "", "", "", "", "", ""],
        ["RSK-005", "", "", "", "", "", "", "", "", "", ""],
      ],
      [7, 16, 9, 4, 4, 5, 7, 18, 10, 10, 10]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    para("Categories: Operational, Compliance, Financial, Reputational, Health & Safety, Technology"),
    pageBreakPara(),
  ];
}

// 11. Training Matrix
function section11() {
  return [
    heading("11. TRAINING MATRIX (ISO 9001:2015 Clause 7.2)"),
    para("Document Reference: PRL-QMS-TRN-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Role", "Required Training", "Evidence of Competence", "Review Date", "Status"],
      [
        ["Recruitment Consultant", "Recruitment legislation, PRISM system, GDPR awareness, H&S basics", "Certificate / PRISM log", "", ""],
        ["Compliance Officer", "Right to Work checks, CSCS verification, DBS process, regulatory updates", "Certificate / Audit record", "", ""],
        ["Payroll Administrator", "PRISM timesheet module, payroll legislation, RTI reporting", "Certificate / System log", "", ""],
        ["Operations Manager", "QMS awareness, ISO 9001 requirements, leadership, risk management", "Training record", "", ""],
        ["Quality Manager", "ISO 9001:2015 Lead Auditor, internal audit, CAPA management", "Certificate / CPD log", "", ""],
        ["All Staff", "QMS induction, Quality Policy, data protection, health and safety", "Induction record", "", ""],
      ],
      [18, 30, 20, 15, 12]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    para("Training records are maintained in PRISM and reviewed quarterly. Gaps identified are addressed through the Continual Improvement Log."),
    pageBreakPara(),
  ];
}

// 12. Document Control Register
function section12() {
  return [
    heading("12. DOCUMENT CONTROL REGISTER (ISO 9001:2015 Clause 7.5)"),
    para("Document Reference: PRL-QMS-DCR-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Doc ID", "Document Title", "Version", "Author", "Approved By", "Date", "Location"],
      [
        ["PRL-QMS-POL-001", "Quality Policy", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-MAN-001", "Quality Manual", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-SCP-001", "Scope Statement", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-OBJ-001", "Quality Objectives", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-NCR-001", "NCR/CAPA Form", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-AUD-001", "Internal Audit Checklist", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-AUS-001", "Internal Audit Schedule", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-MRA-001", "Management Review Agenda", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-MRM-001", "Management Review Minutes", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-RSK-001", "Risk Register", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-TRN-001", "Training Matrix", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-DCR-001", "Document Control Register", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-CFB-001", "Customer Feedback Form", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-CAR-001", "Corrective Action Request", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-CIL-001", "Continual Improvement Log", "1.0", "Quality Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-PRC-001", "Process Map: Contractor Onboarding", "1.0", "Operations Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-PRC-002", "Process Map: Timesheet & Billing", "1.0", "Operations Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
        ["PRL-QMS-PRC-003", "Process Map: Compliance Management", "1.0", "Operations Manager", "Adella Thomas", "Mar 2026", "PRISM / QMS folder"],
      ],
      [14, 22, 7, 14, 14, 10, 16]
    ),
    pageBreakPara(),
  ];
}

// 13. Customer Feedback Form
function section13() {
  return [
    heading("13. CUSTOMER FEEDBACK FORM (ISO 9001:2015 Clause 8.2.1)"),
    para("Document Reference: PRL-QMS-CFB-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Client Detail", "Information"],
      [
        ["Client Name", ""],
        ["Contact Person", ""],
        ["Date", ""],
        ["Service Period", ""],
        ["Completed By", ""],
      ],
      [25, 75]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    heading("Service Rating (1 = Poor, 5 = Excellent)", HeadingLevel.HEADING_2),
    makeTable(
      ["Category", "1", "2", "3", "4", "5", "Comments"],
      [
        ["Quality of contractors provided", "", "", "", "", "", ""],
        ["Speed of response to requests", "", "", "", "", "", ""],
        ["Compliance and documentation", "", "", "", "", "", ""],
        ["Communication and account management", "", "", "", "", "", ""],
        ["Timesheet and billing accuracy", "", "", "", "", "", ""],
        ["Overall satisfaction with PRL services", "", "", "", "", "", ""],
      ],
      [28, 6, 6, 6, 6, 6, 42]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    ...fieldBlock("What do we do well?", 3),
    ...fieldBlock("What could we improve?", 3),
    ...fieldBlock("Would you recommend PRL Site Solutions? (Yes / No / Reason)", 2),
    new Paragraph({ spacing: { after: 80 } }),
    para("Thank you for your feedback. Your responses help us continually improve our services."),
    pageBreakPara(),
  ];
}

// 14. Corrective Action Request
function section14() {
  return [
    heading("14. CORRECTIVE ACTION REQUEST (ISO 9001:2015 Clause 10.2)"),
    para("Document Reference: PRL-QMS-CAR-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["CAR Detail", "Information"],
      [
        ["CAR Number", "CAR-____-____"],
        ["Date Raised", ""],
        ["Raised By", ""],
        ["Department / Process", ""],
        ["Source", "Audit / Customer Complaint / NCR / Management Review / Other"],
        ["Priority", "Critical / High / Medium / Low"],
      ],
      [25, 75]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    ...fieldBlock("Description of Nonconformity or Issue", 4),
    ...fieldBlock("Evidence / Reference Documents", 2),
    ...fieldBlock("Root Cause Analysis", 4),
    ...fieldBlock("Proposed Corrective Action", 4),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Implementation Plan", HeadingLevel.HEADING_2),
    makeTable(
      ["Step", "Action", "Responsible", "Target Date", "Completed"],
      [
        ["1", "", "", "", ""],
        ["2", "", "", "", ""],
        ["3", "", "", "", ""],
      ],
      [8, 37, 20, 17, 18]
    ),
    new Paragraph({ spacing: { after: 80 } }),
    ...fieldBlock("Verification of Effectiveness (to be completed after implementation)", 3),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["Sign-off", "Name", "Signature", "Date"],
      [
        ["Raised By", "", "", ""],
        ["Action Owner", "", "", ""],
        ["Quality Manager", "", "", ""],
        ["Closed By", "", "", ""],
      ],
      [20, 30, 30, 20]
    ),
    pageBreakPara(),
  ];
}

// 15. Continual Improvement Log
function section15() {
  return [
    heading("15. CONTINUAL IMPROVEMENT LOG (ISO 9001:2015 Clause 10.3)"),
    para("Document Reference: PRL-QMS-CIL-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    makeTable(
      ["CI ID", "Description", "Source", "Priority", "Owner", "Status", "Outcome"],
      [
        ["CI-001", "", "", "", "", "", ""],
        ["CI-002", "", "", "", "", "", ""],
        ["CI-003", "", "", "", "", "", ""],
        ["CI-004", "", "", "", "", "", ""],
        ["CI-005", "", "", "", "", "", ""],
        ["CI-006", "", "", "", "", "", ""],
        ["CI-007", "", "", "", "", "", ""],
        ["CI-008", "", "", "", "", "", ""],
        ["CI-009", "", "", "", "", "", ""],
        ["CI-010", "", "", "", "", "", ""],
      ],
      [8, 22, 12, 10, 12, 10, 22]
    ),
    new Paragraph({ spacing: { after: 120 } }),
    heading("Field Definitions", HeadingLevel.HEADING_2),
    bulletItem("Source: Audit, Customer Feedback, NCR, Management Review, Staff Suggestion, PRISM Data, Other"),
    bulletItem("Priority: High, Medium, Low"),
    bulletItem("Status: Identified, In Progress, Completed, Closed"),
    bulletItem("Outcome: Description of the result achieved or benefit gained"),
    new Paragraph({ spacing: { after: 80 } }),
    para("This log is reviewed at each Management Review meeting and updated as improvement initiatives progress."),
    pageBreakPara(),
  ];
}

// 16. Process Map: Contractor Onboarding
function section16() {
  return [
    heading("16. PROCESS MAP: CONTRACTOR ONBOARDING (ISO 9001:2015 Clause 8.1)"),
    para("Document Reference: PRL-QMS-PRC-001  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Owner: Operations Manager", HeadingLevel.HEADING_2),
    para("Inputs: Client staffing request, candidate applications"),
    para("Outputs: Fully compliant contractor ready for placement"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Flow", HeadingLevel.HEADING_2),
    flowStep("START: Client staffing request received"),
    flowArrow(), flowDown(),
    flowStep("Source candidates (job boards, database, referrals)"),
    flowArrow(), flowDown(),
    flowStep("Screen CV and conduct telephone interview"),
    flowArrow(), flowDown(),
    flowStep("DECISION: Candidate suitable? --- NO ---> Reject and notify"),
    flowArrow(), flowDown(),
    flowStep("YES: Issue supply agreement via PRISM onboarding portal"),
    flowArrow(), flowDown(),
    flowStep("Candidate completes online registration in PRISM"),
    flowArrow(), flowDown(),
    flowStep("Collect and verify: Right to Work, CSCS card, qualifications, references"),
    flowArrow(), flowDown(),
    flowStep("DECISION: All compliance documents valid? --- NO ---> Request missing docs"),
    flowArrow(), flowDown(),
    flowStep("YES: PRISM marks contractor as COMPLIANT"),
    flowArrow(), flowDown(),
    flowStep("Conduct H&S induction and site-specific briefing"),
    flowArrow(), flowDown(),
    flowStep("Assign contractor to client placement"),
    flowArrow(), flowDown(),
    flowStep("PRISM sends confirmation to client and contractor"),
    flowArrow(), flowDown(),
    flowStep("END: Contractor placed and active"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Key Controls", HeadingLevel.HEADING_2),
    bulletItem("PRISM automated compliance checks prevent placement of non-compliant contractors"),
    bulletItem("Document expiry alerts sent automatically 30 days before expiry"),
    bulletItem("All records stored in PRISM contractor profile"),
    pageBreakPara(),
  ];
}

// 17. Process Map: Timesheet & Billing
function section17() {
  return [
    heading("17. PROCESS MAP: TIMESHEET & BILLING (ISO 9001:2015 Clause 8.1)"),
    para("Document Reference: PRL-QMS-PRC-002  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Owner: Payroll Manager", HeadingLevel.HEADING_2),
    para("Inputs: Contractor hours worked, agreed pay/charge rates"),
    para("Outputs: Accurate contractor payment and client invoice"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Flow", HeadingLevel.HEADING_2),
    flowStep("START: Contractor submits weekly timesheet via PRISM"),
    flowArrow(), flowDown(),
    flowStep("Site supervisor approves hours in PRISM"),
    flowArrow(), flowDown(),
    flowStep("DECISION: Hours approved? --- NO ---> Return to contractor for correction"),
    flowArrow(), flowDown(),
    flowStep("YES: PRISM calculates pay (basic, overtime, allowances, deductions)"),
    flowArrow(), flowDown(),
    flowStep("Payroll team reviews calculated amounts"),
    flowArrow(), flowDown(),
    flowStep("DECISION: Calculations correct? --- NO ---> Investigate and adjust"),
    flowArrow(), flowDown(),
    flowStep("YES: Process payment via BACS"),
    flowArrow(), flowDown(),
    flowStep("PRISM generates client invoice based on approved hours and charge rates"),
    flowArrow(), flowDown(),
    flowStep("Invoice reviewed and sent to client"),
    flowArrow(), flowDown(),
    flowStep("Monitor payment receipt against credit terms"),
    flowArrow(), flowDown(),
    flowStep("DECISION: Payment received on time? --- NO ---> Escalate per credit control process"),
    flowArrow(), flowDown(),
    flowStep("YES: Mark invoice as paid in PRISM"),
    flowArrow(), flowDown(),
    flowStep("END: Payment cycle complete"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Key Controls", HeadingLevel.HEADING_2),
    bulletItem("Dual approval: site supervisor + payroll team"),
    bulletItem("PRISM validates rates against contract terms"),
    bulletItem("Automated reconciliation reports generated weekly"),
    pageBreakPara(),
  ];
}

// 18. Process Map: Compliance Management
function section18() {
  return [
    heading("18. PROCESS MAP: COMPLIANCE MANAGEMENT (ISO 9001:2015 Clause 8.1)"),
    para("Document Reference: PRL-QMS-PRC-003  |  Version: 1.0", { size: 20, color: "666666" }),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Owner: Compliance Manager", HeadingLevel.HEADING_2),
    para("Inputs: Contractor documentation, regulatory requirements, client specifications"),
    para("Outputs: Verified contractor compliance, audit-ready records"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Process Flow", HeadingLevel.HEADING_2),
    flowStep("START: New contractor registered in PRISM"),
    flowArrow(), flowDown(),
    flowStep("PRISM generates compliance checklist based on role and client requirements"),
    flowArrow(), flowDown(),
    flowStep("Contractor uploads required documents via PRISM portal"),
    flowArrow(), flowDown(),
    flowStep("Compliance team verifies each document for authenticity and validity"),
    flowArrow(), flowDown(),
    flowStep("DECISION: All documents valid? --- NO ---> Notify contractor, request resubmission"),
    flowArrow(), flowDown(),
    flowStep("YES: Right to Work verification (online check or manual)"),
    flowArrow(), flowDown(),
    flowStep("CSCS card validation via PRISM integration"),
    flowArrow(), flowDown(),
    flowStep("DBS check initiated where required"),
    flowArrow(), flowDown(),
    flowStep("References obtained and verified"),
    flowArrow(), flowDown(),
    flowStep("PRISM sets compliance status to GREEN (fully compliant)"),
    flowArrow(), flowDown(),
    flowStep("ONGOING: PRISM monitors document expiry dates"),
    flowArrow(), flowDown(),
    flowStep("PRISM sends 30-day expiry alerts to contractor and compliance team"),
    flowArrow(), flowDown(),
    flowStep("DECISION: Document renewed on time? --- NO ---> Suspend contractor placement"),
    flowArrow(), flowDown(),
    flowStep("YES: Update records, maintain GREEN status"),
    flowArrow(), flowDown(),
    flowStep("END: Continuous compliance maintained"),
    new Paragraph({ spacing: { after: 80 } }),
    heading("Key Controls", HeadingLevel.HEADING_2),
    bulletItem("Automated expiry monitoring prevents lapsed compliance"),
    bulletItem("Contractor cannot be assigned to site unless status is GREEN"),
    bulletItem("Monthly compliance reports generated for management review"),
    bulletItem("Client-specific requirements mapped in PRISM per contract"),
  ];
}

// ============================================================
// BUILD DOCUMENT
// ============================================================

async function main() {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullet-list",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
            { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) } } } },
          ],
        },
        {
          reference: "numbered-list",
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } } },
            { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(1.0), hanging: convertInchesToTwip(0.25) } } } },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22 },
        },
        heading1: {
          run: { font: FONT, size: 32, bold: true, color: PRL_BLUE },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        heading2: {
          run: { font: FONT, size: 26, bold: true, color: PRL_BLUE },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT, orientation: PageOrientation.PORTRAIT },
            margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(1), right: convertInchesToTwip(1) },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "PRL Site Solutions \u2014 ISO 9001:2015", font: FONT, size: 18, color: PRL_BLUE, bold: true }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Page ", font: FONT, size: 16, color: "999999" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "999999" }),
                  new TextRun({ text: " of ", font: FONT, size: 16, color: "999999" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: "999999" }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPage(),
          ...section1(),
          ...section2(),
          ...section3(),
          ...section4(),
          ...section5(),
          ...section6(),
          ...section7(),
          ...section8(),
          ...section9(),
          ...section10(),
          ...section11(),
          ...section12(),
          ...section13(),
          ...section14(),
          ...section15(),
          ...section16(),
          ...section17(),
          ...section18(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("PRL_ISO9001_Document_Pack.docx", buffer);
  console.log("SUCCESS: PRL_ISO9001_Document_Pack.docx generated (" + buffer.length + " bytes)");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
