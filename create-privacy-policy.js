const { Document, Packer, Paragraph, TextRun, Header, Footer, AlignmentType, HeadingLevel, PageNumber, BorderStyle, LevelFormat, TabStopType, TabStopPosition } = require("docx");
const fs = require("fs");

const BLUE = "005F8C";
const GRAY = "666666";

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "PRL Site Solutions", font: "Arial", size: 16, color: BLUE, bold: true }),
                new TextRun({ text: "\tPrivacy Policy", font: "Arial", size: 16, color: GRAY }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "PRL Site Solutions Ltd | Confidential", font: "Arial", size: 14, color: GRAY }),
                new TextRun({ text: "\tPage ", font: "Arial", size: 14, color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 14, color: GRAY }),
                new TextRun({ text: " of ", font: "Arial", size: 14, color: GRAY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 14, color: GRAY }),
              ],
              tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 4 } },
            }),
          ],
        }),
      },
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "PRL SITE SOLUTIONS", size: 40, bold: true, font: "Arial", color: BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: "Recruitment Specialists", size: 24, font: "Arial", color: GRAY, italics: true })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "PRIVACY POLICY", size: 36, bold: true, font: "Arial", color: "333333" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Document Reference: PRL-PP-001", size: 18, color: GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Version: 1.0  |  Effective Date: 24 March 2026", size: 18, color: GRAY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Approved by: Adella Thomas, Director", size: 18, color: GRAY })],
        }),

        // 1. Introduction
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Introduction")] }),
        p("PRL Site Solutions Ltd (\"PRL\", \"we\", \"us\", \"our\") is committed to protecting the privacy and security of personal data belonging to our contractors, clients, suppliers, and website visitors."),
        p("This Privacy Policy explains how we collect, use, store, and protect your personal information in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018."),
        p("PRL Site Solutions Ltd is the data controller for the personal data described in this policy."),

        // 2. Data We Collect
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Personal Data We Collect")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Contractor Data")] }),
        bullet("Full name, date of birth, and contact details (email, phone, address, postcode)"),
        bullet("National Insurance number and UTR number"),
        bullet("Emergency contact name, phone number, and relationship"),
        bullet("Employment history, CV/resume, and qualifications"),
        bullet("CSCS card details, DBS check results, and other compliance certifications"),
        bullet("IR35 status determination and assessment results"),
        bullet("Right to work documentation (passport, visa, ID)"),
        bullet("Professional insurance certificates"),
        bullet("Bank details for payment processing"),
        bullet("Timesheet data including hours worked, overtime, and approval status"),
        bullet("Assignment history and performance records"),
        bullet("Photographs and digital signatures"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Client and Supplier Data")] }),
        bullet("Company name, registration number, and registered address"),
        bullet("Contact person name, email, phone number, and job title"),
        bullet("Contract and purchase order details"),
        bullet("Invoice and payment information"),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Website and System Data")] }),
        bullet("Login credentials (email address and encrypted password)"),
        bullet("IP address, browser type, and device information"),
        bullet("System activity logs and audit trail data"),
        bullet("Cookie data and session information"),

        // 3. Legal Basis
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Legal Basis for Processing")] }),
        p("We process personal data under the following legal bases as defined by UK GDPR Article 6:"),
        bullet("Contract Performance (Article 6(1)(b)) \u2014 processing necessary to fulfil our contractual obligations to contractors, clients, and suppliers"),
        bullet("Legal Obligation (Article 6(1)(c)) \u2014 processing required by employment law, tax regulations, health and safety legislation, and immigration rules"),
        bullet("Legitimate Interests (Article 6(1)(f)) \u2014 processing necessary for business operations including workforce planning, quality management, and fraud prevention"),
        bullet("Consent (Article 6(1)(a)) \u2014 where we rely on your consent, you have the right to withdraw it at any time"),

        // 4. How We Use Data
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. How We Use Your Data")] }),
        p("We use personal data for the following purposes:"),
        bullet("Contractor recruitment, onboarding, and placement management"),
        bullet("Compliance verification including right to work checks, CSCS validation, DBS checks, and IR35 assessments"),
        bullet("Timesheet processing, approval, and payroll/invoicing"),
        bullet("Health and safety management and emergency contact purposes"),
        bullet("Quality management and ISO 9001 compliance"),
        bullet("Client reporting and workforce planning"),
        bullet("Communication regarding assignments, compliance renewals, and account management"),
        bullet("Legal and regulatory compliance including HMRC reporting"),
        bullet("System security, audit, and fraud prevention"),

        // 5. Data Sharing
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Who We Share Data With")] }),
        p("We may share personal data with the following categories of recipients:"),
        bullet("Client companies \u2014 contractor name, qualifications, compliance status, and assignment details as required for placement"),
        bullet("Umbrella companies and payroll providers \u2014 for payment processing"),
        bullet("HMRC \u2014 as required by tax and employment legislation"),
        bullet("Professional bodies \u2014 for qualification and certification verification"),
        bullet("Cloud service providers \u2014 who host our systems (data processed within the UK/EEA or under adequate safeguards)"),
        bullet("Auditors and regulators \u2014 as required for ISO 9001 certification and legal compliance"),
        bullet("Legal advisors \u2014 where necessary for legal proceedings or advice"),
        p("We do not sell personal data to third parties. We do not share data with any party for marketing purposes without explicit consent."),

        // 6. Data Storage and Security
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Data Storage and Security")] }),
        p("Personal data is stored securely using the following measures:"),
        bullet("All data is encrypted in transit (TLS/SSL) and at rest"),
        bullet("Access is controlled through role-based authentication with unique user credentials"),
        bullet("Passwords are stored using industry-standard bcrypt hashing"),
        bullet("All system access is logged with full audit trail (user, action, timestamp)"),
        bullet("Cloud infrastructure is hosted on SOC 2-compliant platforms with automated backups"),
        bullet("Document storage uses encrypted cloud object storage with access controls"),
        bullet("Regular security reviews are conducted as part of our ISO 9001 quality management system"),

        // 7. Data Retention
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Data Retention")] }),
        p("We retain personal data only for as long as necessary to fulfil the purposes for which it was collected:"),
        bullet("Active contractor records \u2014 retained for the duration of the working relationship plus 6 years"),
        bullet("Compliance documents (CSCS, DBS, right to work) \u2014 retained for 6 years after expiry or end of engagement"),
        bullet("Timesheet and payroll data \u2014 retained for 6 years as required by HMRC"),
        bullet("IR35 assessments \u2014 retained for 6 years from end of tax year"),
        bullet("Client and supplier records \u2014 retained for 6 years after end of contract"),
        bullet("System audit logs \u2014 retained for 3 years"),
        bullet("Unsuccessful applicant data \u2014 retained for 12 months then securely deleted"),
        p("After the retention period, data is securely deleted or anonymised."),

        // 8. Your Rights
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Your Rights")] }),
        p("Under UK GDPR, you have the following rights regarding your personal data:"),
        bullet("Right of Access \u2014 request a copy of the personal data we hold about you"),
        bullet("Right to Rectification \u2014 request correction of inaccurate or incomplete data"),
        bullet("Right to Erasure \u2014 request deletion of your data where there is no compelling reason to continue processing"),
        bullet("Right to Restrict Processing \u2014 request limitation of how we use your data"),
        bullet("Right to Data Portability \u2014 receive your data in a structured, commonly used format"),
        bullet("Right to Object \u2014 object to processing based on legitimate interests"),
        bullet("Rights Related to Automated Decision-Making \u2014 not to be subject to decisions based solely on automated processing"),
        p("To exercise any of these rights, please contact us using the details in Section 11. We will respond to your request within one calendar month."),

        // 9. Cookies
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. Cookies and Tracking")] }),
        p("Our system uses essential cookies required for authentication and session management. These cookies are strictly necessary for the system to function and do not require consent."),
        p("We do not use advertising cookies, analytics tracking, or third-party marketing cookies."),

        // 10. International Transfers
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. International Data Transfers")] }),
        p("Where personal data is processed outside the UK, we ensure appropriate safeguards are in place including:"),
        bullet("Adequacy decisions by the UK Government"),
        bullet("Standard Contractual Clauses (SCCs) approved by the ICO"),
        bullet("Binding corporate rules where applicable"),

        // 11. Contact
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("11. Contact Information")] }),
        p("If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact:"),
        new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: "Data Protection Contact:", bold: true, size: 22 })] }),
        p("PRL Site Solutions Ltd"),
        p("Email: info@prlsitesolutions.co.uk"),
        p("Phone: 0800 772 3959"),
        new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: "Supervisory Authority:", bold: true, size: 22 })] }),
        p("If you are not satisfied with our response, you have the right to lodge a complaint with the Information Commissioner\u2019s Office (ICO):"),
        p("Website: www.ico.org.uk"),
        p("Helpline: 0303 123 1113"),

        // 12. Changes
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("12. Changes to This Policy")] }),
        p("We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Any significant changes will be communicated to affected individuals. The current version will always be available within the PRISM system and upon request."),

        // Sign-off
        new Paragraph({ spacing: { before: 600 }, children: [] }),
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: BLUE, space: 8 } },
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: "Document Approval", size: 26, bold: true, color: BLUE })],
        }),
        new Paragraph({ spacing: { after: 40 }, children: [
          new TextRun({ text: "Prepared by: ", color: GRAY, size: 20 }),
          new TextRun({ text: "PRISM System", size: 20, bold: true }),
        ]}),
        new Paragraph({ spacing: { after: 40 }, children: [
          new TextRun({ text: "Reviewed by: ", color: GRAY, size: 20 }),
          new TextRun({ text: "Adella Thomas, Director", size: 20, bold: true }),
        ]}),
        new Paragraph({ spacing: { after: 40 }, children: [
          new TextRun({ text: "Approved by: ", color: GRAY, size: 20 }),
          new TextRun({ text: "Adella Thomas, Director", size: 20, bold: true }),
        ]}),
        new Paragraph({ spacing: { after: 40 }, children: [
          new TextRun({ text: "Date: ", color: GRAY, size: 20 }),
          new TextRun({ text: "24 March 2026", size: 20, bold: true }),
        ]}),
        new Paragraph({ spacing: { after: 40 }, children: [
          new TextRun({ text: "Next Review: ", color: GRAY, size: 20 }),
          new TextRun({ text: "24 March 2027", size: 20, bold: true }),
        ]}),
      ],
    },
  ],
});

function p(text) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22 })] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, size: 22 })] });
}

Packer.toBuffer(doc).then(buffer => {
  const path = "C:\\Users\\LAPTOP80\\OneDrive - prlsitesolutions.co.uk\\Desktop\\prl_req\\PRL_Privacy_Policy.docx";
  fs.writeFileSync(path, buffer);
  console.log("Privacy Policy created:", path, `(${buffer.length} bytes)`);
});
