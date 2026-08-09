/**
 * Generates three documents for PRL Site Solutions:
 * 1. Anti-Bribery and Corruption Policy
 * 2. Gifts and Hospitality Policy
 * 3. Gifts and Hospitality Register (template)
 *
 * Run: npx tsx scripts/generate-bribery-gifts.ts
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
function body(text: string, bold = false, color = "000000") {
  return new Paragraph({ children: [new TextRun({ text, bold, size: 22, color })], spacing: { after: 120 } });
}
function bullet(text: string) {
  return new Paragraph({ children: [new TextRun({ text, size: 22 })], bullet: { level: 0 }, spacing: { after: 80 } });
}
function spacer() { return new Paragraph({ text: "", spacing: { after: 160 } }); }

function titleBlock(title: string, ref: string, version: string) {
  return [
    new Paragraph({ children: [new TextRun({ text: COMPANY, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 34, color: "1F3864" })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
    new Paragraph({
      children: [new TextRun({ text: `Ref: ${ref}  |  Version: ${version}  |  Issue Date: ${DATE}  |  Review: ${REVIEW}`, size: 18, color: "666666" })],
      alignment: AlignmentType.CENTER, spacing: { after: 320 },
    }),
  ];
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

// ─── Doc 1: Anti-Bribery and Corruption Policy ───────────────────────────────

async function makeABC() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Anti-Bribery and Corruption Policy", "PRL-POL-ABC-001", "1.0"),

        h1("1. Purpose and Commitment"),
        body(`${COMPANY} has a zero-tolerance approach to bribery and corruption in all its forms. This policy sets out the company's responsibilities and the responsibilities of those working for us to uphold the requirements of the Bribery Act 2010.`),
        body("We are committed to conducting all business honestly, ethically, and with integrity. We will not engage in bribery or corruption and will not tolerate it being undertaken on our behalf."),
        spacer(),

        h1("2. Scope"),
        body("This policy applies to:"),
        bullet("All employees, permanent and temporary"),
        bullet("Directors and company officers"),
        bullet("Contractors and agency workers engaged by the company"),
        bullet("All associated persons acting on behalf of PRL Site Solutions Ltd, including agents, intermediaries, and supply chain partners"),
        body("This policy applies to conduct in all countries and jurisdictions in which the company operates or has business relationships."),
        spacer(),

        h1("3. What is Bribery?"),
        body("Bribery is the offering, promising, giving, accepting, or soliciting of any financial or other advantage to induce or reward someone to perform a function improperly. This includes:"),
        bullet("Offering, promising, or giving a bribe — even if the offer is not accepted"),
        bullet("Requesting or accepting a bribe"),
        bullet("Bribing a foreign public official"),
        bullet("Failing to prevent an associated person from bribing on the company's behalf"),
        body("Corruption is the abuse of entrusted power for private gain. Both bribery and corruption are criminal offences under the Bribery Act 2010 and carry penalties of up to 10 years' imprisonment and unlimited fines for individuals, and unlimited fines for organisations."),
        spacer(),

        h1("4. Prohibited Conduct"),
        body("The following are strictly prohibited:"),
        bullet("Offering or giving any financial or non-financial advantage to any person to secure business, a contract, a regulatory approval, or any other benefit for the company"),
        bullet("Requesting, agreeing to receive, or accepting any advantage — financial or otherwise — as an inducement or reward for acting improperly"),
        bullet("Making or accepting facilitation payments — unofficial payments to public officials to speed up routine processes"),
        bullet("Using a third party (agent, consultant, introducer) to offer or pay a bribe on the company's behalf"),
        bullet("Engaging in conduct that would constitute bribery of a foreign public official"),
        spacer(),

        h1("5. Gifts, Hospitality, and Facilitation Payments"),
        body("Gifts and hospitality must be managed in accordance with the company's separate Gifts and Hospitality Policy. In summary:"),
        bullet("Reasonable, proportionate, and transparent gifts and hospitality are permitted where they are for a legitimate business purpose"),
        bullet("All gifts and hospitality received or given above £25 in value must be recorded in the Gifts and Hospitality Register"),
        bullet("No gift or hospitality should be offered or accepted where it could influence or appear to influence a business decision"),
        bullet("Cash gifts are never acceptable"),
        bullet("Facilitation payments are never acceptable, regardless of local custom or practice"),
        spacer(),

        h1("6. Due Diligence on Third Parties"),
        body("PRL Site Solutions Ltd will conduct appropriate due diligence on third parties who act on its behalf, including:"),
        bullet("Labour providers, subcontractors, and supply chain partners"),
        bullet("Agents and introducers"),
        bullet("Any third party representing the company in dealings with clients or public bodies"),
        body("Due diligence includes obtaining confirmation that third parties have anti-bribery policies in place, and including anti-bribery warranties in contracts with key suppliers and partners."),
        spacer(),

        h1("7. Responsibilities"),
        tbl([
          ["Director", "Overall accountability for anti-bribery compliance; approval of any unusual payments or arrangements; recipient of reported concerns"],
          ["All Staff", "Compliance with this policy; immediate reporting of any suspicion of bribery or corruption"],
          ["Office Manager / HR", "Maintenance of the Gifts and Hospitality Register; delivery of training"],
          ["Third Parties", "Compliance with this policy as a condition of engagement"],
        ]),
        spacer(),

        h1("8. Reporting Concerns"),
        body("Any person who suspects bribery or corruption, or who is asked to pay or receive a bribe, must report this immediately to:"),
        bullet(`Director — ${COMPANY}: info@prlsitesolutions.co.uk`),
        bullet("Alternatively, reports can be made via the Whistleblowing Policy on an anonymous basis"),
        body("Reports will be investigated promptly and confidentially. No one who reports a genuine concern in good faith will suffer any detriment, even if the concern proves unfounded."),
        spacer(),

        h1("9. Consequences of Breach"),
        body("Any employee found to have breached this policy will face disciplinary action up to and including dismissal. Any contractor or associated person found to have engaged in bribery or corruption will have their contract terminated immediately. The company will also consider whether to refer the matter to the relevant authorities."),
        spacer(),

        h1("10. Training"),
        body("All staff receive training on the Bribery Act 2010 and this policy at induction. Annual refresher training is provided. Training records are maintained by HR/Office Manager."),
        spacer(),

        h1("11. Review"),
        body(`This policy is reviewed annually or following any change in legislation or significant incident. Next review: ${REVIEW}.`),
        spacer(),

        h1("12. Approval"),
        tbl([
          ["Approved by", `Director, ${COMPANY}`],
          ["Date", DATE],
          ["Version", "1.0"],
          ["Document Ref", "PRL-POL-ABC-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-Anti-Bribery-and-Corruption-Policy.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

// ─── Doc 2: Gifts and Hospitality Policy ─────────────────────────────────────

async function makeGiftsPolicy() {
  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Gifts and Hospitality Policy", "PRL-POL-GH-001", "1.0"),

        h1("1. Purpose"),
        body(`This policy sets out ${COMPANY}'s approach to the giving and receiving of gifts and hospitality by employees, directors, and associated persons. It supports the company's Anti-Bribery and Corruption Policy and ensures compliance with the Bribery Act 2010.`),
        spacer(),

        h1("2. Scope"),
        body("This policy applies to all employees, directors, contractors, and any person acting on behalf of PRL Site Solutions Ltd."),
        spacer(),

        h1("3. General Principles"),
        bullet("Gifts and hospitality must be reasonable, proportionate, and transparent"),
        bullet("They must serve a legitimate business purpose — building or maintaining a business relationship"),
        bullet("They must never be offered or accepted as an inducement or reward for any business favour or decision"),
        bullet("They must never cause embarrassment to the company or create a perception of impropriety"),
        bullet("When in doubt, decline and report to the Director"),
        spacer(),

        h1("4. Receiving Gifts"),
        h2("4.1 Permitted"),
        bullet("Gifts of a token or promotional nature (branded items, pens, calendars) with a value of less than £25"),
        bullet("Occasional hospitality of a reasonable value — working lunches, site visits, industry events — where attendance is for a legitimate business purpose"),
        bullet("Seasonal gifts (e.g. Christmas hampers) up to £50 in value"),
        spacer(),

        h2("4.2 Not Permitted"),
        bullet("Cash gifts or cash equivalents (vouchers, gift cards) of any value"),
        bullet("Gifts above £50 in value from a single supplier, client, or contractor in any 12-month period"),
        bullet("Any gift offered or accepted in connection with a tender, contract award, or business decision"),
        bullet("Gifts from anyone seeking to influence a regulatory, planning, or contractual outcome"),
        bullet("Personal hospitality that goes beyond what is reasonable and proportionate (holidays, sporting events with significant monetary value, etc.)"),
        spacer(),

        h2("4.3 Process for Receiving a Gift Above £25"),
        bullet("Inform the Director immediately"),
        bullet("Record the gift in the Gifts and Hospitality Register within 5 working days"),
        bullet("Director to confirm whether the gift may be retained, shared (e.g. placed in a communal area), or returned"),
        spacer(),

        h1("5. Giving Gifts"),
        h2("5.1 Permitted"),
        bullet("Branded promotional materials (pens, notepads, bags) up to £25 per item"),
        bullet("Working lunches and reasonable business entertainment in connection with a client or supplier relationship"),
        bullet("Seasonal gifts to clients up to £50 per person, where these are clearly of a goodwill nature"),
        spacer(),

        h2("5.2 Not Permitted"),
        bullet("Cash or cash equivalent gifts of any value"),
        bullet("Gifts to public officials (council, HMRC, HSE, etc.) of any value"),
        bullet("Gifts above £50 in value to any individual client, supplier, or contractor"),
        bullet("Gifts offered in anticipation of or following a contract award or commercial decision"),
        bullet("Gifts paid for by the company without Director approval"),
        spacer(),

        h2("5.3 Process for Giving a Gift Above £25"),
        bullet("Obtain prior written approval from the Director"),
        bullet("Record the gift in the Gifts and Hospitality Register before or immediately after it is given"),
        spacer(),

        h1("6. Business Hospitality"),
        body("Business hospitality (meals, events, entertainment) is acceptable where:"),
        bullet("It is for a clear and legitimate business purpose"),
        bullet("It is reasonable and proportionate to the nature of the business relationship"),
        bullet("It is transparent — openly offered and not concealed"),
        bullet("It is not in connection with a pending tender, contract decision, or regulatory matter"),
        body("Hospitality with a value exceeding £50 per person must be recorded in the Gifts and Hospitality Register and, if given, requires Director approval."),
        spacer(),

        h1("7. Gifts and Hospitality Register"),
        body("A Gifts and Hospitality Register is maintained by the Office Manager / Director. All gifts and hospitality received or given with a value above £25 must be recorded within 5 working days. The register is reviewed quarterly by the Director."),
        body("The register records: date, description, estimated value, given/received, who gave/received, business purpose, and outcome (retained/returned/approved)."),
        spacer(),

        h1("8. Conflicts of Interest"),
        body("Any situation where a gift or hospitality could create a conflict of interest — real or perceived — must be disclosed to the Director immediately. A conflict of interest arises where a personal benefit could influence, or be seen to influence, a professional decision."),
        spacer(),

        h1("9. Reporting Concerns"),
        body("Any person who believes a gift or hospitality offered or received may constitute a bribe, or who is uncomfortable with a gift or hospitality situation, should report this immediately to:"),
        bullet(`Director — info@prlsitesolutions.co.uk`),
        bullet("Anonymous reporting is available via the Whistleblowing Policy"),
        spacer(),

        h1("10. Consequences of Breach"),
        body("Breach of this policy may constitute a breach of the Bribery Act 2010 and will be treated as serious misconduct, which may result in disciplinary action up to and including dismissal."),
        spacer(),

        h1("11. Review"),
        body(`This policy is reviewed annually. Next review: ${REVIEW}.`),
        spacer(),

        h1("12. Approval"),
        tbl([
          ["Approved by", `Director, ${COMPANY}`],
          ["Date", DATE],
          ["Version", "1.0"],
          ["Document Ref", "PRL-POL-GH-001"],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-Gifts-and-Hospitality-Policy.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

// ─── Doc 3: Gifts and Hospitality Register ───────────────────────────────────

async function makeGiftsRegister() {
  const headers = [
    "Date", "Given / Received", "Description of Gift or Hospitality",
    "Estimated Value (£)", "Given by / Received from", "Company / Role",
    "Business Purpose / Justification", "Approved by", "Outcome\n(Retained / Returned / Declined)",
  ];

  const exampleRows = [
    ["01/01/2026", "Received", "Branded pen set from client — Christmas gift", "£15", "Client ABC Ltd", "Site Manager", "Seasonal goodwill — below £25 threshold", "N/A (below threshold)", "Retained"],
    ["15/03/2026", "Received", "Working lunch — client meeting", "£35", "Client XYZ Ltd", "Director", "Quarterly business review", "Director", "Retained"],
    ["[Date]", "[Given / Received]", "[Description]", "[£]", "[Name]", "[Company / Role]", "[Purpose]", "[Name]", "[Outcome]"],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", ""],
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: "FFFFFF" })] })],
      shading: { fill: "1F3864", type: ShadingType.CLEAR, color: "auto" },
    })),
  });

  const dataRows = exampleRows.map((r, ri) => new TableRow({
    children: r.map((v, ci) => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: v, size: 16, color: ri < 2 ? "1F3864" : (v.startsWith("[") ? "C00000" : "000000"), italics: ri < 2 })] })],
      shading: { fill: ri < 2 ? "EBF3FB" : "FFFFFF", type: ShadingType.CLEAR, color: "auto" },
    })),
  }));

  const doc = new Document({
    sections: [{
      children: [
        ...titleBlock("Gifts and Hospitality Register", "PRL-REG-GH-001", "1.0"),

        body("This register must be maintained by the Office Manager / Director. All gifts and hospitality given or received with a value above £25 must be recorded within 5 working days. The register is reviewed quarterly by the Director.", false, "444444"),
        spacer(),
        tbl([
          ["Company", COMPANY],
          ["Document Ref", "PRL-REG-GH-001"],
          ["Maintained by", "Office Manager / Director"],
          ["Review Frequency", "Quarterly"],
          ["Last Reviewed", "[Date]"],
          ["Next Review Due", "[Date]"],
        ]),
        spacer(),

        body("Threshold Reminder:", true),
        bullet("Gifts / hospitality below £25 — no entry required, but may be recorded at discretion"),
        bullet("Gifts / hospitality £25–£50 — record within 5 working days; Director informed"),
        bullet("Gifts / hospitality above £50 — Director approval required BEFORE giving; record immediately"),
        bullet("Cash gifts — never acceptable regardless of value"),
        spacer(),

        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),

        spacer(),
        body("Quarterly Review Sign-off", true),
        spacer(),
        tbl([
          ["Q1 Review — Date", ""],
          ["Q1 Reviewed by", ""],
          ["Q2 Review — Date", ""],
          ["Q2 Reviewed by", ""],
          ["Q3 Review — Date", ""],
          ["Q3 Reviewed by", ""],
          ["Q4 Review — Date", ""],
          ["Q4 Reviewed by", ""],
        ]),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  const fp = path.join(OUT_DIR, "PRL-Gifts-and-Hospitality-Register.docx");
  fs.writeFileSync(fp, buf);
  console.log(`✅ ${fp}`);
}

async function main() {
  await makeABC();
  await makeGiftsPolicy();
  await makeGiftsRegister();
  console.log(`\n📁 All documents saved to: ${OUT_DIR}`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
