/**
 * Generates PRL Site Solutions Business Continuity & Disaster Recovery Plan
 * Run: npx tsx scripts/generate-bcp-drp.ts
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
function spacer() { return new Paragraph({ text: "", spacing: { after: 160 } }); }

function titleBlock() {
  return [
    new Paragraph({ children: [new TextRun({ text: COMPANY, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: "Business Continuity & Disaster Recovery Plan", bold: true, size: 34, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({
      children: [new TextRun({ text: `Document Ref: PRL-BCP-001  |  Version: 1.1  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`, size: 18, color: "666666" })],
      alignment: AlignmentType.CENTER, spacing: { after: 320 },
    }),
  ];
}

function twoColTable(rows: [string, string][], headerFill = "1F3864") {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v], i) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20, color: i === 0 && l === l ? "000000" : "000000" })] })],
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: "E8EEF7", type: ShadingType.CLEAR, color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })],
          width: { size: 70, type: WidthType.PERCENTAGE },
        }),
      ],
    })),
  });
}

function headerTable(rows: [string, string][]) {
  return twoColTable(rows);
}

function riskTable() {
  const headers = ["Threat / Scenario", "Likelihood", "Impact", "Risk Level", "Priority"];
  const data = [
    ["Loss of internet / telephone connectivity", "High", "High", "Critical", "1"],
    ["Key personnel unavailability (illness, accident)", "Medium", "High", "High", "2"],
    ["IT system failure / data loss", "Medium", "Critical", "Critical", "1"],
    ["Office premises inaccessible (flood, fire)", "Low", "High", "Medium", "3"],
    ["Cyber attack / ransomware", "Medium", "Critical", "Critical", "1"],
    ["Key client loss / sudden demand spike", "Medium", "Medium", "Medium", "3"],
    ["Supply chain / labour provider failure", "Medium", "High", "High", "2"],
    ["Severe weather event", "Low", "Medium", "Low", "4"],
    ["GDPR / regulatory breach", "Low", "High", "Medium", "3"],
    ["Loss of payroll / HMRC filing capability", "Low", "Critical", "High", "2"],
  ];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })],
      shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
    })),
  });
  const dataRows = data.map(r => new TableRow({
    children: r.map((v, i) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: v, size: 18, color: (i === 3 && (v === "Critical" || v === "High")) ? "C00000" : "000000" })] })],
    })),
  }));
  return new Table({ layout: TableLayoutType.FIXED, width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

function rtoTable() {
  const headers = ["Function / System", "RTO (Recovery Time)", "RPO (Data Loss Tolerance)", "Owner"];
  const data = [
    ["PRISM Workforce Platform", "4 hours", "24 hours", "Director / IT"],
    ["Microsoft 365 (Outlook, Teams, SharePoint)", "2 hours", "4 hours", "Director / IT"],
    ["Company laptops (hardware failure / loss)", "4 hours", "24 hours", "Director / IT"],
    ["Payroll processing", "24 hours", "48 hours", "Office Manager"],
    ["Contractor timesheets", "4 hours", "24 hours", "Operations Lead"],
    ["Client invoicing", "48 hours", "48 hours", "Finance / Director"],
    ["Compliance documentation", "24 hours", "48 hours", "Compliance Lead"],
    ["Phone / mobile communications", "1 hour", "N/A", "All staff"],
    ["Office premises access", "24 hours", "N/A", "Director"],
  ];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })],
      shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
    })),
  });
  const dataRows = data.map(r => new TableRow({
    children: r.map(v => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })],
    })),
  }));
  return new Table({ layout: TableLayoutType.FIXED, width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

function contactTable() {
  const headers = ["Role", "Name", "Mobile", "Email", "Escalation"];
  const data = [
    ["Director / BCP Owner", "PRL Director", "Held internally", "info@prlsitesolutions.co.uk", "Primary"],
    ["Office Manager", "Office Manager", "Held internally", "info@prlsitesolutions.co.uk", "Secondary"],
    ["IT Support", "External IT Provider", "Held internally", "Held internally", "IT incidents"],
    ["Payroll / Accountant", "External Accountant", "Held internally", "Held internally", "Payroll failure"],
    ["PRISM Platform Support", "PRISM Support Team", "N/A", "support@prismworkforce.online", "System outage"],
    ["Legal / HR Adviser", "External Legal Adviser", "Held internally", "Held internally", "Legal / HR"],
  ];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: "FFFFFF" })] })],
      shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
    })),
  });
  const dataRows = data.map(r => new TableRow({
    children: r.map(v => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: v, size: 18 })] })],
    })),
  }));
  return new Table({ layout: TableLayoutType.FIXED, width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] });
}

async function makeBCP() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock(),

        h1("1. Document Information"),
        headerTable([
          ["Company", COMPANY],
          ["Document Owner", "Director, PRL Site Solutions Ltd"],
          ["Document Ref", "PRL-BCP-001"],
          ["Version", "1.0"],
          ["Issue Date", DATE],
          ["Review Date", REVIEW],
          ["Classification", "Confidential — Internal Use"],
        ]),
        spacer(),

        h1("2. Purpose and Scope"),
        body("This Business Continuity and Disaster Recovery Plan (BCP/DRP) sets out the procedures PRL Site Solutions Ltd will follow to maintain or rapidly restore critical business operations following a disruptive incident."),
        body("The plan covers:"),
        bullet("All core business functions: contractor placement, payroll, compliance, client services"),
        bullet("Digital systems: PRISM Workforce Platform, Microsoft 365 suite (Outlook, Teams, SharePoint, OneDrive, Word, Excel), payroll software, document storage"),
        bullet("IT hardware: company laptops and mobile devices"),
        bullet("Physical premises and key personnel"),
        bullet("Supply chain and client-facing operations"),
        spacer(),

        h1("3. Business Continuity Objectives"),
        body("The company's primary continuity objectives are:"),
        bullet("Protect the safety and welfare of staff and contractors"),
        bullet("Maintain payment of contractors on time in all circumstances"),
        bullet("Preserve client relationships and minimise service disruption"),
        bullet("Protect personal data and comply with UK GDPR at all times"),
        bullet("Resume full normal operations within 5 working days of any major incident"),
        spacer(),

        h1("4. Threat and Risk Assessment"),
        body("The following threats have been assessed for likelihood and impact:"),
        spacer(),
        riskTable(),
        spacer(),

        h1("5. Recovery Time and Point Objectives"),
        body("The following RTOs and RPOs apply to critical business functions:"),
        spacer(),
        rtoTable(),
        spacer(),

        h1("6. Critical Business Functions"),
        h2("6.1 Contractor Placement and Operations"),
        body("This is the core revenue-generating function. Continuity measures include:"),
        bullet("All active placements recorded in PRISM — accessible remotely by any authorised device"),
        bullet("Client and contractor contact details stored in PRISM and backed up to cloud"),
        bullet("Operations can be managed remotely by director or office manager from any location"),
        bullet("Backup labour providers identified for each key sector in the event of supply chain failure"),
        spacer(),

        h2("6.2 Payroll and Contractor Payments"),
        bullet("Payroll processed via external accountant — function can be performed remotely"),
        bullet("Backup payroll provider identified in the event of primary provider unavailability"),
        bullet("BACS payment files can be submitted via online banking from any authorised device"),
        bullet("In the event of system failure, timesheets are available in PRISM and can be exported to CSV for manual processing"),
        bullet("HMRC can be notified of late filing via employer helpline if necessary"),
        spacer(),

        h2("6.3 PRISM Workforce Management Platform"),
        bullet("Hosted on Railway cloud infrastructure — managed availability and automatic failover"),
        bullet("Database hosted on Railway PostgreSQL with automated daily backups"),
        bullet("File storage hosted on Cloudflare R2 — geographically distributed, highly available"),
        bullet("In the event of platform outage: paper/email-based timesheet collection activated; PRISM support contacted immediately"),
        bullet("Recovery target: 4-hour RTO; 24-hour RPO"),
        spacer(),

        h2("6.4 Microsoft 365 Suite"),
        body("PRL Site Solutions Ltd uses Microsoft 365 (licensed via GoDaddy) as its primary productivity and communication platform. The suite covers:"),
        bullet("Outlook — primary email for all staff; accessible via browser at outlook.office.com on any device"),
        bullet("Microsoft Teams — internal communications, video calls, file sharing; accessible via browser or mobile app"),
        bullet("SharePoint / OneDrive — document storage and collaboration; all files stored in cloud, not local drives"),
        bullet("Word / Excel — document creation and payroll workbooks; files saved to OneDrive, not local storage only"),
        body("Continuity measures:"),
        bullet("All M365 apps accessible via any browser — no dependency on a specific laptop or device"),
        bullet("OneDrive sync ensures documents are available even if a laptop is lost or fails"),
        bullet("Microsoft 365 SLA: 99.9% uptime guarantee — outages handled by Microsoft; status monitored at status.office.com"),
        bullet("In the event of M365 outage: mobile phones and WhatsApp used for communications; PRISM remains operational independently"),
        bullet("Admin access to M365 tenant held by Director — user accounts can be reset or new devices added remotely"),
        spacer(),

        h2("6.5 IT Hardware — Laptops and Devices"),
        body("Company laptops are the primary working devices for all office-based staff. The following continuity measures apply:"),
        bullet("All working files stored in OneDrive / SharePoint — no critical data held solely on local drives"),
        bullet("In the event of laptop failure: replacement device can be operational within 4 hours — sign in to Microsoft 365, PRISM, and online banking to restore full working capability"),
        bullet("Spare device or personal device used as interim fallback where replacement is not immediately available"),
        bullet("Laptops protected by Windows login credentials and Microsoft 365 account — remote wipe capability available via Microsoft Entra ID (Azure AD) in the event of loss or theft"),
        bullet("BitLocker or equivalent encryption enabled on all company laptops"),
        bullet("Laptop loss or theft: report to Director immediately; remote wipe initiated; ICO notified if personal data at risk"),
        bullet("Hardware insurance held as part of company business insurance policy"),
        spacer(),

        h2("6.6 Communications"),
        bullet("Primary: Outlook email via Microsoft 365 — accessible via web browser on any device if laptop unavailable"),
        bullet("Secondary: Microsoft Teams — voice and video calls, chat; mobile app available"),
        bullet("Tertiary: mobile phones — all key staff have personal and work mobile numbers documented"),
        bullet("Quaternary: WhatsApp group for emergency staff communications"),
        bullet("Client and contractor contact lists stored in PRISM and Outlook contacts — accessible from any device"),
        spacer(),

        h2("6.5 Office Premises"),
        bullet("In the event of premises being inaccessible: all staff move to remote working immediately via personal or spare laptops"),
        bullet("All critical systems are cloud-based (PRISM, Microsoft 365, online banking) — accessible from any location with internet access"),
        bullet("Physical documents: key compliance documents held in cloud storage; originals in fireproof storage at premises"),
        bullet("Alternative workspace: director's home office as interim base if required"),
        spacer(),

        h1("7. Incident Response Procedure"),
        h2("Step 1 — Immediate Response (0–1 hour)"),
        bullet("Incident identified and reported to Director (BCP Owner)"),
        bullet("Assess immediate safety of staff and contractors"),
        bullet("Activate emergency communications — notify key staff via mobile/WhatsApp"),
        bullet("Determine scale and likely duration of disruption"),
        bullet("Isolate affected systems if cyber incident suspected"),
        spacer(),

        h2("Step 2 — Assessment and Activation (1–4 hours)"),
        bullet("Director convenes incident response team (key staff + external IT/payroll if required)"),
        bullet("Assess impact on critical functions against RTO/RPO targets"),
        bullet("Activate relevant continuity procedures from Section 6"),
        bullet("Notify clients if service disruption is likely — honest, timely communication"),
        bullet("Notify contractors if payments or placements are affected"),
        bullet("Contact external support (IT, legal, payroll) as required"),
        spacer(),

        h2("Step 3 — Recovery (4 hours – 5 days)"),
        bullet("Execute recovery actions for each affected system/function"),
        bullet("Monitor progress against RTO targets"),
        bullet("Keep clients and contractors updated daily until full service restored"),
        bullet("Maintain incident log throughout recovery"),
        bullet("Escalate to insurance provider if losses are incurred"),
        spacer(),

        h2("Step 4 — Review and Close"),
        bullet("Full incident debrief within 5 working days of resolution"),
        bullet("Root cause analysis documented"),
        bullet("BCP updated if gaps identified"),
        bullet("Lessons learned shared with all staff"),
        spacer(),

        h1("8. Cyber Incident Response"),
        body("In the event of a suspected cyber attack, ransomware, or data breach:"),
        bullet("Immediately disconnect affected devices from the network"),
        bullet("Do not pay any ransom demand — contact IT support and legal adviser first"),
        bullet("Notify Director and IT support within 1 hour"),
        bullet("If personal data is compromised: follow Data Protection Policy breach procedure — ICO must be notified within 72 hours if risk to individuals"),
        bullet("Preserve evidence — do not delete files or attempt DIY recovery"),
        bullet("Contact cyber insurance provider"),
        bullet("Restore from last known clean backup once systems are confirmed safe"),
        spacer(),

        h1("9. Key Contacts and Escalation"),
        spacer(),
        contactTable(),
        spacer(),

        h1("10. Data Backup and Recovery"),
        body("The following backup arrangements are in place:"),
        infoTableInline([
          ["PRISM Platform Database", "Automated daily backups via Railway PostgreSQL — retained 30 days"],
          ["PRISM File Storage", "Cloudflare R2 — geographically distributed; versioning enabled"],
          ["Microsoft 365 (Outlook, Teams, SharePoint, OneDrive)", "Microsoft cloud infrastructure — 99.9% SLA; Exchange Online 30-day recycle bin; OneDrive version history retained 180 days; SharePoint recycle bin 93 days"],
          ["Company laptops", "All files stored in OneDrive — device-independent; remote wipe via Microsoft Entra ID; hardware replaceable within 4 hours"],
          ["Payroll data", "Held by external accountant; local copy on encrypted drive"],
          ["Compliance documents", "Cloud document storage (SharePoint / OneDrive) — version history retained"],
          ["Contractor records", "PRISM database — exported quarterly to encrypted backup"],
        ]),
        spacer(),

        h1("11. Insurance"),
        body("PRL Site Solutions Ltd maintains the following insurance policies relevant to business continuity:"),
        bullet("Employers' Liability Insurance"),
        bullet("Public Liability Insurance"),
        bullet("Professional Indemnity Insurance"),
        bullet("Cyber Liability Insurance (covers data breach response costs and business interruption)"),
        body("Insurance details are held by the Director and reviewed annually."),
        spacer(),

        h1("12. Testing and Exercising"),
        body("This plan will be tested to ensure it remains effective:"),
        infoTableInline([
          ["Annual desktop exercise", "Tabletop walkthrough of a simulated incident — all key staff"],
          ["System recovery test", "Annual test restore from backup to verify recovery capability"],
          ["Communication test", "Bi-annual check of emergency contact list accuracy"],
          ["Plan review", `Annual review — next review: ${REVIEW}`],
        ]),
        spacer(),

        h1("13. Responsibilities"),
        infoTableInline([
          ["Director", "BCP Owner — overall accountability; incident declaration; client communication"],
          ["Office Manager", "Payroll continuity; contractor communications; document access"],
          ["All staff", "Compliance with this plan; reporting incidents immediately; remote working capability"],
          ["External IT", "System recovery; cyber incident response; backup restoration"],
          ["External Accountant", "Payroll continuity; HMRC communications"],
        ]),
        spacer(),

        h1("14. Plan Maintenance"),
        body(`This plan is reviewed annually or following any significant change to business operations, IT systems, or key personnel. Any lessons identified from a real incident or test exercise are incorporated immediately. Next scheduled review: ${REVIEW}.`),
        spacer(),

        h1("15. Approval"),
        infoTableInline([
          ["Approved by", `Director, ${COMPANY}`],
          ["Date", DATE],
          ["Version", "1.1"],
          ["Document Ref", "PRL-BCP-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-Business-Continuity-Disaster-Recovery-Plan.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

function infoTableInline(rows: [string, string][]) {
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

makeBCP().catch(e => { console.error("❌", e); process.exit(1); });
