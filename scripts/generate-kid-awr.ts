/**
 * Generates two compliance documents for PRL Site Solutions:
 * 1. Key Information Document (KID) — worker template
 * 2. Agency Workers Regulations (AWR) Process
 *
 * Run: npx tsx scripts/generate-kid-awr.ts
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
function divider() {
  return new Paragraph({
    children: [new TextRun({ text: "─".repeat(80), color: "CCCCCC", size: 18 })],
    spacing: { before: 160, after: 160 },
  });
}

function titleBlock(title: string, ref: string, version: string) {
  return [
    new Paragraph({ children: [new TextRun({ text: COMPANY, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 34, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({
      children: [new TextRun({ text: `Document Ref: ${ref}  |  Version: ${version}  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`, size: 18, color: "666666" })],
      alignment: AlignmentType.CENTER, spacing: { after: 320 },
    }),
  ];
}

function infoTable(rows: [string, string][]) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v]) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20 })] })],
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: "E8EEF7", type: ShadingType.CLEAR, color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20 })] })],
          width: { size: 65, type: WidthType.PERCENTAGE },
        }),
      ],
    })),
  });
}

function fillInTable(rows: [string, string][]) {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([l, v]) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: l, bold: true, size: 20 })] })],
          width: { size: 45, type: WidthType.PERCENTAGE },
          shading: { fill: "E8EEF7", type: ShadingType.CLEAR, color: "auto" },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 20, color: v.startsWith("[") ? "C00000" : "000000" })] })],
          width: { size: 55, type: WidthType.PERCENTAGE },
        }),
      ],
    })),
  });
}

// ─── Doc 1: Key Information Document ────────────────────────────────────────

async function makeKID() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Key Information Document", "PRL-KID-001", "1.0"),

        new Paragraph({
          children: [new TextRun({ text: "IMPORTANT — Please read this document carefully before agreeing to work through PRL Site Solutions Ltd. This document is provided in accordance with the Conduct of Employment Agencies and Employment Businesses (Amendment) Regulations 2019.", size: 20, italics: true, color: "C00000" })],
          spacing: { after: 240 },
        }),

        h1("Section 1 — About PRL Site Solutions Ltd"),
        infoTable([
          ["Company Name", "PRL Site Solutions Ltd"],
          ["Type of Business", "Employment Business (supplying temporary workers)"],
          ["Registered Address", "15 Beryl Road, Prenton, Wirral, CH43 9RS"],
          ["Contact Email", "info@prlsitesolutions.co.uk"],
          ["Contact Telephone", "0800 772 3959"],
          ["Compliance Portal", "www.prismworkforce.online"],
        ]),
        spacer(),

        h1("Section 2 — About Your Engagement"),
        fillInTable([
          ["Worker Full Name", "[Worker name]"],
          ["Date of Issue", "[Date]"],
          ["Type of Contract", "Worker — engaged as a self-employed contractor or via umbrella company"],
          ["Hirer / Client Name", "[Client company name]"],
          ["Site / Location", "[Site address]"],
          ["Role / Job Title", "[e.g. Electrician, Labourer, Plant Operator]"],
          ["Expected Start Date", "[Date]"],
          ["Expected Duration / End Date", "[Date or 'Ongoing — subject to client requirements']"],
          ["Minimum Hours Guaranteed", "None — assignments are offered as available; no minimum hours guaranteed"],
        ]),
        spacer(),

        h1("Section 3 — Pay"),
        body("The following information sets out how you will be paid for work undertaken through PRL Site Solutions Ltd:"),
        spacer(),
        fillInTable([
          ["Minimum Pay Rate", "[£ per hour] — this is the minimum you will receive; actual rate may be higher depending on assignment"],
          ["Pay Frequency", "Weekly — payment made each Friday for the preceding week worked"],
          ["Payment Method", "BACS bank transfer directly to your personal or umbrella company bank account"],
          ["Timesheet Submission Deadline", "Timesheets must be submitted and approved via PRISM by [day/time] each week"],
          ["Overtime Rate", "[£ per hour or 'Same rate' — confirm per assignment]"],
          ["Holiday Pay", "See Section 4 below"],
        ]),
        spacer(),

        h1("Section 4 — Holiday Entitlement and Pay"),
        body("As a worker engaged through PRL Site Solutions Ltd you are entitled to statutory paid holiday under the Working Time Regulations 1998."),
        infoTable([
          ["Statutory Entitlement", "5.6 weeks per year (28 days including bank holidays, pro-rated for part-year / part-week workers)"],
          ["Holiday Pay Calculation", "Holiday pay is calculated based on your average weekly pay over the preceding 52 weeks (or the number of weeks worked if less than 52)"],
          ["How Holiday Pay is Paid", "Holiday pay is paid when holiday is taken. You must request holiday in advance via your PRL contact."],
          ["Rolled-Up Holiday Pay", "PRL Site Solutions Ltd does NOT operate rolled-up holiday pay. Holiday pay is paid when leave is taken."],
          ["Umbrella Workers", "If you are paid via an umbrella company, your umbrella employer is responsible for paying your holiday pay. Please refer to your umbrella company's terms."],
        ]),
        spacer(),

        h1("Section 5 — Deductions from Pay"),
        body("The following deductions may be made from your pay:"),
        infoTable([
          ["Income Tax", "Deducted at source by your umbrella company or under the Construction Industry Scheme (CIS) as applicable"],
          ["National Insurance", "Deducted at source by your umbrella company as applicable"],
          ["Umbrella Company Margin", "If paid via umbrella: the umbrella company's margin is deducted before your net pay is calculated. PRL does not control this amount — check your umbrella company's terms."],
          ["Any Other Deductions", "No other deductions are made by PRL Site Solutions Ltd without your written consent."],
        ]),
        body("PRL Site Solutions Ltd will never make deductions for tools, PPE, or training unless specifically agreed in writing with you in advance."),
        spacer(),

        h1("Section 6 — Expenses and Benefits"),
        infoTable([
          ["Travel / Subsistence", "Not paid by PRL Site Solutions Ltd unless specifically agreed per assignment"],
          ["PPE / Equipment", "[Confirm per assignment — e.g. 'Provided by client' or 'Worker to supply own']"],
          ["Pension", "If eligible, pension auto-enrolment is managed by your umbrella company. PRL Site Solutions Ltd does not operate a pension scheme for self-employed contractors."],
          ["Other Benefits", "None, unless specifically stated in writing for a particular assignment"],
        ]),
        spacer(),

        h1("Section 7 — Your Employment Status"),
        body("PRL Site Solutions Ltd operates as an Employment Business. This means:"),
        bullet("You are NOT an employee of PRL Site Solutions Ltd"),
        bullet("You are NOT an employee of the client (hirer) you are placed with"),
        bullet("You are a worker, engaged on a temporary basis for specific assignments"),
        bullet("You may be paid via your own limited company, a compliant umbrella company, or under CIS"),
        body("Your IR35 / employment status for tax purposes will be assessed at the point of each assignment and communicated to you in writing."),
        spacer(),

        h1("Section 8 — Agency Workers Regulations 2010"),
        body("After completing 12 continuous weeks in the same role with the same hirer, you may qualify for equal treatment rights under the Agency Workers Regulations 2010 (AWR). This includes:"),
        bullet("Equal pay — the same basic pay as a comparable permanent employee"),
        bullet("Equal working time — the same working hours, rest breaks, and annual leave as comparable permanent employees"),
        bullet("From day one: access to the hirer's facilities (canteen, childcare, car parking) and notification of job vacancies"),
        body("PRL Site Solutions Ltd will notify you when your 12-week qualifying period is approaching and will work with the hirer to ensure your rights are met."),
        spacer(),

        h1("Section 9 — Conduct and Termination"),
        infoTable([
          ["Notice Period", "Assignments can be ended by either party without notice unless otherwise stated per assignment"],
          ["Conduct", "You are expected to comply with the hirer's site rules, health and safety policies, and any CSCS or certification requirements"],
          ["Timesheets", "Failure to submit timesheets on time may delay payment. PRL cannot guarantee payment for hours not recorded on an approved timesheet."],
          ["Disputes", "Any pay disputes should be raised immediately with your PRL contact. We aim to resolve all disputes within 5 working days."],
        ]),
        spacer(),

        h1("Section 10 — How to Contact Us"),
        infoTable([
          ["General Enquiries", "info@prlsitesolutions.co.uk | 0800 772 3959"],
          ["Pay Queries", "Submit via PRISM: www.prismworkforce.online/payment-query"],
          ["Compliance / Documents", "Submit via PRISM: www.prismworkforce.online"],
          ["Complaints", "Direct to Director at: info@prlsitesolutions.co.uk"],
        ]),
        spacer(),

        divider(),
        body("Worker Acknowledgement", true),
        spacer(),
        body("By signing below, I confirm that I have received and read this Key Information Document prior to agreeing to work through PRL Site Solutions Ltd."),
        spacer(),
        infoTable([
          ["Worker Name (print)", ""],
          ["Worker Signature", ""],
          ["Date", ""],
          ["PRL Representative", ""],
          ["PRL Signature", ""],
          ["Date", ""],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-Key-Information-Document-Template.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

// ─── Doc 2: AWR Process ──────────────────────────────────────────────────────

async function makeAWR() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Agency Workers Regulations 2010 — Process and Compliance", "PRL-AWR-001", "1.0"),

        h1("1. Purpose"),
        body("This document sets out PRL Site Solutions Ltd's process for complying with the Agency Workers Regulations 2010 (AWR). It covers the rights of agency workers, the 12-week qualifying period, responsibilities of the employment business and hirer, and the operational procedures in place to ensure compliance."),
        spacer(),

        h1("2. What the AWR Requires"),
        body("The Agency Workers Regulations 2010 give agency workers two categories of rights:"),
        spacer(),

        h2("2.1 Day-One Rights (from the first day of any assignment)"),
        body("From the first day of their engagement, agency workers are entitled to:"),
        bullet("Access to the hirer's collective facilities — canteen, prayer room, car parking, crèche, transport services, waiting areas"),
        bullet("Information about job vacancies at the hirer that they may be eligible to apply for (whether temporary or permanent)"),
        body("These rights apply immediately regardless of how long the worker has been placed or how many hours they work."),
        spacer(),

        h2("2.2 Equal Treatment Rights (after 12 qualifying weeks)"),
        body("After completing a 12-week qualifying period in the same role with the same hirer, agency workers are entitled to the same basic working and employment conditions as if they had been directly recruited by the hirer, including:"),
        bullet("Basic pay — the same rate of pay as a comparable direct employee in the same role"),
        bullet("Working time — same working hours, overtime, rest breaks, and rest periods"),
        bullet("Annual leave — the same entitlement to paid annual leave (above the statutory minimum)"),
        bullet("Night work limits"),
        bullet("Pregnant workers — the right to paid time off for ante-natal appointments from day one"),
        body("Note: Equal treatment applies to basic pay only — it does not extend to occupational sick pay, pension contributions, redundancy pay, maternity/paternity pay, or benefits in kind unless specifically agreed."),
        spacer(),

        h1("3. The 12-Week Qualifying Period"),
        h2("3.1 What counts towards the 12 weeks"),
        bullet("Any week in which the worker works at least one day for the same hirer in the same role"),
        bullet("Weeks continue to accumulate even if hours vary week to week"),
        bullet("Breaks of 6 weeks or less do not reset the clock"),
        bullet("Breaks due to pregnancy, childbirth, parental leave, or jury service do not reset the clock"),
        bullet("Breaks due to annual leave, sickness, or industrial action do not reset the clock"),
        spacer(),

        h2("3.2 What resets the 12-week clock"),
        bullet("A break of more than 6 weeks for any reason other than those protected above"),
        bullet("The worker starting a new substantively different role with the same or a different hirer"),
        bullet("The worker moving to a different hirer"),
        spacer(),

        h1("4. PRL Site Solutions Ltd's AWR Process"),

        h2("Step 1 — Worker Onboarding"),
        bullet("All workers are issued a Key Information Document (KID) prior to commencing any assignment — this includes a summary of their AWR rights"),
        bullet("PRISM records the worker's start date, role, and hirer for each assignment"),
        bullet("The operations team is responsible for ensuring every placement is logged in PRISM before the worker starts"),
        spacer(),

        h2("Step 2 — Tracking the Qualifying Period"),
        bullet("PRISM tracks each worker's cumulative weeks per hirer and role"),
        bullet("At week 10, an automatic alert is generated to the PRL operations lead: 'Worker [name] approaching AWR 12-week qualifying period with [hirer]'"),
        bullet("The operations lead contacts the hirer to confirm the worker's start date, role, and the basic pay/conditions of a comparable permanent employee"),
        bullet("If the hirer cannot confirm comparable conditions, PRL's director reviews and determines the appropriate equal treatment package"),
        spacer(),

        h2("Step 3 — Week 12 — Applying Equal Treatment"),
        bullet("From the first day of week 13, the worker's pay and conditions are reviewed against the hirer's comparable permanent employee terms"),
        bullet("If the current rate is below the comparable rate: PRL increases the pay rate from the qualifying date"),
        bullet("If the current rate already meets or exceeds the comparable rate: no change required; this is documented in PRISM"),
        bullet("The worker is notified in writing of the outcome of the AWR assessment"),
        bullet("The hirer is notified of any pay rate adjustment and the reason"),
        spacer(),

        h2("Step 4 — Ongoing Monitoring"),
        bullet("PRISM continues to track working conditions for the duration of the assignment post-qualifying period"),
        bullet("If the hirer changes the terms of comparable direct employees, PRL must be notified by the hirer so equal treatment can be maintained"),
        bullet("Any change in role is assessed by the operations lead — if the new role is substantively different, the qualifying period resets"),
        spacer(),

        h1("5. Hirer Obligations"),
        body("PRL Site Solutions Ltd requires all client hirers to:"),
        bullet("Provide accurate information about the basic pay and working conditions of comparable permanent employees when requested"),
        bullet("Notify PRL immediately if the role or working conditions of the agency worker change materially"),
        bullet("Ensure the worker has access to collective facilities from day one"),
        bullet("Notify PRL if they become aware of any AWR-related concern raised by an agency worker"),
        body("These obligations are included in PRL's standard client terms of business."),
        spacer(),

        h1("6. Worker Obligations"),
        bullet("Workers must accurately record all hours worked via PRISM to enable accurate tracking of the qualifying period"),
        bullet("Workers must notify PRL if their role changes or if they have a break in their assignment"),
        bullet("Workers who believe their AWR rights have not been met should raise this with PRL immediately"),
        spacer(),

        h1("7. Anti-Avoidance"),
        body("PRL Site Solutions Ltd will not:"),
        bullet("Deliberately rotate workers between assignments or roles to prevent them from reaching the 12-week qualifying period"),
        bullet("Change job titles or role descriptions artificially to reset the qualifying period"),
        bullet("Discourage workers from asserting their AWR rights"),
        body("Any instruction from a hirer to structure placements in a way that avoids AWR entitlements will be refused. PRL will not participate in arrangements that circumvent the regulations."),
        spacer(),

        h1("8. Complaints and Disputes"),
        body("Any worker who believes their AWR rights have not been met should:"),
        bullet("Raise the matter with their PRL contact in the first instance"),
        bullet("If unresolved within 5 working days: escalate to the Director at info@prlsitesolutions.co.uk"),
        bullet("Workers may also contact ACAS (0300 123 1100) or the Employment Tribunal Service"),
        body("PRL Site Solutions Ltd will not subject any worker to a detriment for asserting their rights under the AWR."),
        spacer(),

        h1("9. Record Keeping"),
        body("The following records are maintained in PRISM for each worker placement:"),
        infoTable([
          ["Assignment start date", "Recorded at point of placement"],
          ["Role / job title", "Recorded at point of placement; updated if role changes"],
          ["Hirer details", "Client name, site, and contact"],
          ["Qualifying week count", "Automatically tracked by PRISM"],
          ["AWR assessment outcome", "Documented at week 12; stored against worker record"],
          ["Pay rate adjustments", "Recorded with effective date and reason"],
          ["Hirer comparable conditions", "Written confirmation from hirer retained"],
        ]),
        body("All AWR records are retained for a minimum of 2 years after the end of the relevant assignment."),
        spacer(),

        h1("10. Responsibilities"),
        infoTable([
          ["Director", "Overall accountability for AWR compliance; sign-off on any disputed assessments"],
          ["Operations Lead", "Day-to-day tracking of qualifying periods; hirer liaison; worker notification"],
          ["PRISM System", "Automated 12-week tracking and alert generation"],
          ["Finance / Payroll", "Implementation of any pay rate adjustments from qualifying date"],
          ["All Staff", "Awareness of AWR requirements; reporting of any concerns"],
        ]),
        spacer(),

        h1("11. Training"),
        body("All operations staff receive training on the Agency Workers Regulations 2010 at induction. Refresher training is provided annually or following any regulatory change."),
        spacer(),

        h1("12. Review"),
        body(`This process document is reviewed annually or following any change to the Agency Workers Regulations 2010 or associated HMRC/BEIS guidance. Next review: ${REVIEW}.`),
        spacer(),

        h1("13. Approval"),
        infoTable([
          ["Approved by", `Director, ${COMPANY}`],
          ["Date", DATE],
          ["Version", "1.0"],
          ["Document Ref", "PRL-AWR-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const filePath = path.join(OUT_DIR, "PRL-Agency-Workers-Regulations-Process.docx");
  fs.writeFileSync(filePath, buf);
  console.log(`✅ Created: ${filePath}`);
}

async function main() {
  await makeKID();
  await makeAWR();
  console.log(`\n📁 All documents saved to: ${OUT_DIR}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
