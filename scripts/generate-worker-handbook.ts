/**
 * Generates PRL Site Solutions Temporary Worker & Contractor Handbook
 * Run: npx tsx scripts/generate-worker-handbook.ts
 */

import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, ShadingType, TableLayoutType,
  PageBreak,
} from "docx";
import fs from "fs";
import path from "path";

const COMPANY = "PRL Site Solutions Ltd";
const DATE = "19 May 2026";
const REVIEW = "May 2027";
const OUT_DIR = path.join(process.cwd(), "docs");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function h1(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 } });
}
function h2(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}
function body(text: string, bold = false, color = "000000") {
  return new Paragraph({ children: [new TextRun({ text, bold, size: 22, color })], spacing: { after: 120 } });
}
function bullet(text: string, bold = false) {
  return new Paragraph({ children: [new TextRun({ text, size: 22, bold })], bullet: { level: 0 }, spacing: { after: 80 } });
}
function spacer() { return new Paragraph({ text: "", spacing: { after: 160 } }); }
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function boxed(text: string, fill = "FFF2CC", textColor = "7F4F00") {
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 22, color: textColor })] })],
        shading: { fill, type: ShadingType.CLEAR, color: "auto" },
      })],
    })],
  });
}

function tbl(rows: [string, string][]) {
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

async function makeHandbook() {
  const doc = new Document({
    sections: [{
      children: [

        // ── Cover ──────────────────────────────────────────────────────────
        new Paragraph({ children: [new TextRun({ text: "", size: 48 })], spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: COMPANY, bold: true, size: 40, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: "Worker Handbook", bold: true, size: 52, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: "Policies, Code of Conduct & Key Information", size: 28, color: "444444" })], alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
        new Paragraph({ children: [new TextRun({ text: "For Temporary Workers and Subcontractor Staff", size: 24, color: "666666", italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `Issue Date: ${DATE}  |  Version: 1.0  |  Review: ${REVIEW}`, size: 20, color: "888888" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
        new Paragraph({ children: [new TextRun({ text: "Document Ref: PRL-HB-001", size: 20, color: "888888" })], alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
        new Paragraph({
          children: [new TextRun({ text: "Please read this handbook carefully. By accepting an assignment through PRL Site Solutions Ltd you agree to comply with the standards and policies set out in this document.", size: 22, italics: true, color: "C00000" })],
          alignment: AlignmentType.CENTER, spacing: { after: 120 },
        }),
        pb(),

        // ── 1. Welcome ─────────────────────────────────────────────────────
        h1("1. Welcome from PRL Site Solutions"),
        body("Welcome to PRL Site Solutions Ltd. We are a specialist construction recruitment business supplying skilled tradespeople, labourers, plant operators, and site managers to construction, plant hire, and crane hire companies across the UK."),
        body("Whether you have worked with us before or this is your first assignment, this handbook sets out everything you need to know about how we work, what we expect from you, and what you can expect from us."),
        body("If you have any questions at any time, please contact us:"),
        spacer(),
        tbl([
          ["Telephone", "0800 772 3959"],
          ["Email", "info@prlsitesolutions.co.uk"],
          ["Compliance Portal", "www.prismworkforce.online"],
          ["Pay Queries", "www.prismworkforce.online/payment-query"],
          ["Address", "15 Beryl Road, Prenton, Wirral, CH43 9RS"],
        ]),
        spacer(),

        // ── 2. Your Engagement ─────────────────────────────────────────────
        h1("2. Your Engagement with PRL"),
        body("PRL Site Solutions Ltd operates as an Employment Business. This means:"),
        bullet("You are placed on temporary assignments with client companies (hirers)"),
        bullet("You are not an employee of PRL Site Solutions Ltd or of the hirer unless explicitly stated"),
        bullet("Assignments are offered as available — we do not guarantee a minimum number of hours"),
        bullet("You will receive a Key Information Document (KID) before each engagement setting out your pay rate, deductions, and engagement type (CIS, Umbrella, or PAYE)"),
        body("Your assignment details — start date, site, role, and pay rate — will be confirmed in writing before you begin."),
        spacer(),

        // ── 3. Code of Conduct ─────────────────────────────────────────────
        h1("3. Code of Conduct"),
        body("PRL Site Solutions Ltd expects all workers to conduct themselves professionally at all times, both on client sites and when representing the company. The following standards apply to all workers and subcontractors."),
        spacer(),

        h2("3.1 Professional Behaviour"),
        bullet("Treat all colleagues, clients, site staff, and members of the public with respect and courtesy"),
        bullet("Arrive on time and ready to work for every shift"),
        bullet("Carry out work to a competent and professional standard"),
        bullet("Follow all reasonable instructions from the site manager or supervisor"),
        bullet("Wear the correct PPE at all times as required by site rules"),
        bullet("Keep work areas clean, tidy, and safe"),
        spacer(),

        h2("3.2 Prohibited Conduct"),
        body("The following conduct will not be tolerated and may result in immediate removal from site and/or termination of your assignment:"),
        bullet("Attending site under the influence of alcohol or illegal drugs"),
        bullet("Theft, fraud, or dishonesty of any kind"),
        bullet("Violence, threatening behaviour, or aggressive conduct towards any person"),
        bullet("Bullying, harassment, or discrimination on any grounds"),
        bullet("Damage to client property or equipment"),
        bullet("Use of client or PRL equipment or vehicles without authorisation"),
        bullet("Misrepresentation of qualifications, certifications, or experience"),
        bullet("Submitting false or inflated timesheets"),
        bullet("Sharing confidential client or company information without authorisation"),
        bullet("Use of mobile phones where prohibited by site rules"),
        spacer(),

        h2("3.3 Social Media"),
        bullet("Do not post images, video, or information about client sites, staff, or operations on social media without express written permission from the client and PRL"),
        bullet("Do not make any statement on social media that could damage the reputation of PRL Site Solutions Ltd or any client"),
        spacer(),

        // ── 4. Health & Safety ─────────────────────────────────────────────
        h1("4. Health and Safety"),
        body("The safety of all workers, site staff, and members of the public is our highest priority. All workers must comply fully with health and safety legislation and site safety requirements at all times.", true, "C00000"),
        spacer(),

        h2("4.1 Your Responsibilities"),
        bullet("Take reasonable care of your own health and safety and that of others who may be affected by your actions"),
        bullet("Follow all site safety rules, Method Statements, and Risk Assessments"),
        bullet("Wear all required PPE — hard hat, hi-vis vest, safety boots, gloves, eye and ear protection as required"),
        bullet("Never undertake work for which you are not trained or certified"),
        bullet("Report all accidents, near misses, and unsafe conditions to your site supervisor immediately"),
        bullet("Do not operate plant or machinery without the appropriate licence or authorisation"),
        bullet("Cooperate with any health and safety inspection or investigation"),
        spacer(),

        h2("4.2 Reporting Accidents and Incidents"),
        body("All accidents and near misses must be reported to the site supervisor immediately and recorded in the site accident book. If you are injured at work, you must notify PRL Site Solutions Ltd on the same day."),
        spacer(),

        h2("4.3 Drugs and Alcohol"),
        body("A zero-tolerance policy applies to attendance on site under the influence of alcohol or illegal drugs. You may be required to submit to drug and alcohol testing as required by the client site. Failure to comply will result in immediate removal from site."),
        spacer(),

        h2("4.4 Certifications and Licences"),
        bullet("You must hold and maintain all certifications required for your role — CSCS card, CPCS licence, NPORS, asbestos awareness, first aid, working at height, etc."),
        bullet("You must inform PRL immediately if any certification is due to expire or has been revoked"),
        bullet("PRL and clients reserve the right to verify all certifications before you commence or continue work"),
        spacer(),

        // ── 5. Timesheets and Pay ──────────────────────────────────────────
        h1("5. Timesheets and Pay"),
        spacer(),

        h2("5.1 Timesheets"),
        bullet("You must submit your timesheet via PRISM (www.prismworkforce.online) by the deadline specified in your Key Information Document — typically by [day/time] each week"),
        bullet("Timesheets must be accurate — record only hours actually worked"),
        bullet("Timesheets must be approved by your site supervisor or client contact before payment can be processed"),
        bullet("PRL cannot guarantee payment for hours not recorded on an approved timesheet"),
        bullet("If you are unable to submit your timesheet online, contact your PRL representative immediately"),
        spacer(),

        h2("5.2 Pay"),
        bullet("Pay is processed weekly, with payment made by BACS on Friday for the preceding week worked"),
        bullet("Your rate of pay, deductions, and engagement type are set out in your Key Information Document"),
        bullet("If you believe there is an error in your pay, raise a payment query via PRISM: www.prismworkforce.online/payment-query or contact info@prlsitesolutions.co.uk"),
        bullet("PRL will investigate and resolve all genuine pay queries within 5 working days"),
        spacer(),

        h2("5.3 Expenses"),
        bullet("Travel, subsistence, and other expenses are not paid by PRL Site Solutions Ltd unless specifically agreed in writing per assignment"),
        bullet("PPE and tools required for your role will be confirmed per assignment — do not assume these are provided"),
        spacer(),

        // ── 6. Compliance and Documents ────────────────────────────────────
        h1("6. Compliance and Documentation"),
        spacer(),

        h2("6.1 Documents Required Before You Start"),
        body("Before you can be placed on an assignment, you must provide the following via PRISM (www.prismworkforce.online):"),
        bullet("Valid photographic ID (passport or driving licence)"),
        bullet("Proof of right to work in the UK"),
        bullet("National Insurance number"),
        bullet("Bank account details for payment"),
        bullet("All relevant certifications (CSCS, CPCS, NPORS, trade-specific)"),
        bullet("Proof of address (within the last 3 months)"),
        bullet("Signed copy of this handbook (acknowledgement page)"),
        bullet("Completed and signed Key Information Document for your engagement type"),
        body("Failure to provide required documents may delay or prevent your placement."),
        spacer(),

        h2("6.2 Keeping Documents Up to Date"),
        bullet("You are responsible for keeping your certifications current"),
        bullet("Notify PRL immediately if any document, licence, or certification expires, is revoked, or is subject to an investigation"),
        bullet("PRL reserves the right to suspend your assignment if required documents lapse"),
        spacer(),

        h2("6.3 Right to Work"),
        body("PRL Site Solutions Ltd is required by law to verify your right to work in the United Kingdom before placing you on any assignment. You must provide original documents for verification. It is a criminal offence to work in the UK without the right to do so."),
        spacer(),

        // ── 7. Equal Opportunities ─────────────────────────────────────────
        h1("7. Equal Opportunities and Dignity at Work"),
        body("PRL Site Solutions Ltd is committed to providing equal opportunities to all workers regardless of age, disability, gender, gender reassignment, marriage and civil partnership, pregnancy and maternity, race, religion or belief, sex, or sexual orientation."),
        spacer(),

        h2("7.1 No Discrimination or Harassment"),
        bullet("Discrimination, harassment, bullying, or victimisation on any of the protected grounds above will not be tolerated"),
        bullet("This applies to conduct on client sites, travelling to and from sites, and at any work-related events"),
        bullet("Any worker found to have engaged in discrimination or harassment may be immediately removed from site and their assignment terminated"),
        spacer(),

        h2("7.2 Raising a Concern"),
        body("If you experience or witness discrimination, harassment, or bullying, you should report this to PRL Site Solutions Ltd immediately:"),
        bullet("Email: info@prlsitesolutions.co.uk"),
        bullet("Telephone: 0800 772 3959"),
        body("All reports will be taken seriously and investigated. You will not suffer any detriment for making a genuine report."),
        spacer(),

        // ── 8. Modern Slavery ──────────────────────────────────────────────
        h1("8. Modern Slavery and Worker Welfare"),
        body("PRL Site Solutions Ltd has a zero-tolerance approach to modern slavery, forced labour, and human trafficking in all its forms. We are committed to acting ethically and ensuring that modern slavery does not occur in our business or supply chain."),
        spacer(),
        body("All workers placed through PRL Site Solutions Ltd must:"),
        bullet("Be free to choose to work and free to end their engagement without penalty"),
        bullet("Be paid directly to their own bank account — no deductions are made for accommodation, transport, or tools without written consent"),
        bullet("Hold their own identity documents — PRL will never withhold your passport or ID"),
        bullet("Not be subject to debt bondage, threats, or coercion of any kind"),
        spacer(),
        body("If you or anyone you know is being exploited, forced to work, or controlled by another person, please contact:"),
        bullet("PRL Site Solutions Ltd — 0800 772 3959 | info@prlsitesolutions.co.uk"),
        bullet("Modern Slavery Helpline — 0800 0121 700 (free, 24/7, confidential)"),
        bullet("Police — 999 (emergency) or 101"),
        spacer(),

        // ── 9. Anti-Bribery ────────────────────────────────────────────────
        h1("9. Anti-Bribery and Corruption"),
        body("PRL Site Solutions Ltd operates a zero-tolerance approach to bribery and corruption under the Bribery Act 2010. All workers must:"),
        bullet("Never offer, promise, give, or accept any bribe or corrupt payment — in cash or in kind"),
        bullet("Never make facilitation payments to officials to speed up routine processes"),
        bullet("Report any request for a bribe or any suspicion of corrupt conduct immediately to PRL"),
        body("Any worker found to have engaged in bribery or corruption will have their assignment terminated immediately and the matter reported to the relevant authorities."),
        spacer(),

        // ── 10. Data Protection ────────────────────────────────────────────
        h1("10. Data Protection"),
        body("PRL Site Solutions Ltd processes your personal data to manage your engagement, verify your right to work, process your pay, and comply with legal obligations. Full details of how your data is used are set out in our Privacy Notice, which is available at www.prismworkforce.online/privacy."),
        body("You have rights over your personal data including the right to access, correct, and request deletion of your data. Contact info@prlsitesolutions.co.uk to exercise your rights."),
        spacer(),

        // ── 11. Agency Workers Regulations ────────────────────────────────
        h1("11. Agency Workers Regulations 2010 (AWR)"),
        body("After 12 continuous weeks in the same role with the same hirer, you will qualify for equal treatment rights under the Agency Workers Regulations 2010. From day one of any assignment, you have the right to:"),
        bullet("Access the hirer's collective facilities (canteen, car parking, prayer room etc.)"),
        bullet("Be informed of job vacancies at the hirer"),
        body("After 12 qualifying weeks you are additionally entitled to the same basic pay and working conditions as a comparable direct employee. PRL will contact you as you approach this threshold."),
        spacer(),

        // ── 12. Whistleblowing ─────────────────────────────────────────────
        h1("12. Whistleblowing — Raising a Concern"),
        body("If you have a genuine concern about wrongdoing, unsafe practices, fraud, exploitation, or any breach of law or policy, you can raise this confidentially with PRL Site Solutions Ltd:"),
        bullet("Email: info@prlsitesolutions.co.uk (marked 'Confidential — Whistleblowing')"),
        bullet("Telephone: 0800 772 3959"),
        body("You will not suffer any detriment for raising a concern in good faith. Concerns can also be raised anonymously."),
        spacer(),

        // ── 13. Ending an Assignment ────────────────────────────────────────
        h1("13. Ending an Assignment"),
        bullet("Assignments may be ended by the client (hirer) or by PRL at any time unless a minimum notice period has been agreed in writing"),
        bullet("If you wish to leave an assignment, please inform your PRL contact as soon as possible — giving as much notice as you reasonably can helps us plan"),
        bullet("You must return any client-issued access passes, PPE, equipment, or property on your last day"),
        bullet("Any outstanding timesheets must be submitted before payment for your final week can be processed"),
        spacer(),

        // ── 14. Policies Referenced ────────────────────────────────────────
        h1("14. Policies Referenced in This Handbook"),
        body("The following policies are available on request from info@prlsitesolutions.co.uk or via PRISM:"),
        tbl([
          ["Anti-Bribery and Corruption Policy", "PRL-POL-ABC-001"],
          ["Gifts and Hospitality Policy", "PRL-POL-GH-001"],
          ["Data Protection Policy", "PRL-POL-DP-001"],
          ["Modern Slavery Policy Statement", "PRL-POL-MS-001"],
          ["Health and Safety Policy", "Available on request"],
          ["Whistleblowing Policy", "Available on request"],
          ["Agency Workers Regulations Process", "PRL-AWR-001"],
          ["Privacy Notice", "www.prismworkforce.online/privacy"],
        ]),
        spacer(),

        // ── 15. Acknowledgement ────────────────────────────────────────────
        pb(),
        h1("15. Worker Acknowledgement"),
        body("Please sign and return this page to your PRL Site Solutions representative before commencing your first assignment. Retain a copy for your own records."),
        spacer(),
        boxed("By signing below, I confirm that:\n\n• I have received and read the PRL Site Solutions Worker Handbook\n• I understand and agree to comply with the policies and Code of Conduct set out in this handbook\n• I understand that breach of these standards may result in removal from site and/or termination of my assignment\n• I have been given the opportunity to ask questions about any part of this handbook before signing", "EBF3FB", "1F3864"),
        spacer(),
        tbl([
          ["Full Name (print)", ""],
          ["Date of Birth", ""],
          ["National Insurance Number", ""],
          ["Role / Trade", ""],
          ["Signature", ""],
          ["Date Signed", ""],
          ["PRL Representative", ""],
          ["PRL Signature", ""],
          ["Date Issued", DATE],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-Worker-Handbook.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

makeHandbook().catch(e => { console.error("❌", e); process.exit(1); });
