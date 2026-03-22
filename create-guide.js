const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  NumberFormat,
  Footer,
  Header,
  Tab,
  TabStopType,
  TabStopPosition,
  BorderStyle,
  ShadingType,
  TableOfContents,
  StyleLevel,
  LevelFormat,
  convertInchesToTwip,
  PageBreak,
} = require("docx");
const fs = require("fs");

// ─── Helper factories ───────────────────────────────────────────────

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Calibri", color: "1F4E79" })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Calibri", color: "2E75B6" })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", color: "404040" })],
  });
}

function para(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: "Calibri" })],
  });
}

function boldPara(parts) {
  // parts is array of { text, bold? }
  return new Paragraph({
    spacing: { after: 120 },
    children: parts.map(
      (p) => new TextRun({ text: p.text, bold: !!p.bold, size: 22, font: "Calibri" })
    ),
  });
}

function numberedStep(num, textParts) {
  // textParts is array of {text, bold?}
  return new Paragraph({
    numbering: { reference: "steps-numbering", level: 0 },
    spacing: { after: 80 },
    children: textParts.map(
      (p) => new TextRun({ text: p.text, bold: !!p.bold, size: 22, font: "Calibri" })
    ),
  });
}

function bulletPoint(textParts) {
  return new Paragraph({
    numbering: { reference: "bullet-numbering", level: 0 },
    spacing: { after: 60 },
    children: textParts.map(
      (p) => new TextRun({ text: p.text, bold: !!p.bold, size: 22, font: "Calibri" })
    ),
  });
}

function topTip(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "DAEEF7" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6" },
    },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "TOP TIP: ", bold: true, size: 22, font: "Calibri", color: "1F4E79" }),
      new TextRun({ text, size: 22, font: "Calibri", color: "1F4E79" }),
    ],
  });
}

function watchOut(text) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "FDE9D9" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: "E36C09" },
    },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "WATCH OUT: ", bold: true, size: 22, font: "Calibri", color: "C00000" }),
      new TextRun({ text, size: 22, font: "Calibri", color: "C00000" }),
    ],
  });
}

function commonQuestion(question, answer) {
  return new Paragraph({
    spacing: { before: 120, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: "E2EFDA" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: "548235" },
    },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "COMMON QUESTION: ", bold: true, size: 22, font: "Calibri", color: "375623" }),
      new TextRun({ text: question, bold: true, size: 22, font: "Calibri", color: "375623" }),
      new TextRun({ text: " ", size: 22, font: "Calibri" }),
      new TextRun({ text: answer, size: 22, font: "Calibri", color: "375623" }),
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ─── Document assembly ──────────────────────────────────────────────

const doc = new Document({
  creator: "PRL Site Solutions",
  title: "PRL Site Solutions - Complete User Guide",
  description: "A comprehensive dummies guide for the PRL contractor management webapp",
  numbering: {
    config: [
      {
        reference: "steps-numbering",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
          },
        ],
      },
      {
        reference: "bullet-numbering",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
          },
        ],
      },
    ],
  },
  features: {
    updateFields: true,
  },
  styles: {
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 36, bold: true, font: "Calibri", color: "1F4E79" },
        paragraph: { spacing: { before: 400, after: 200 } },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 28, bold: true, font: "Calibri", color: "2E75B6" },
        paragraph: { spacing: { before: 300, after: 150 } },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        run: { size: 24, bold: true, font: "Calibri", color: "404040" },
        paragraph: { spacing: { before: 200, after: 100 } },
      },
    ],
  },
  sections: [
    // ═══ COVER PAGE ═══
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "PRL Site Solutions - Complete User Guide", bold: true, size: 18, font: "Calibri", color: "808080" }),
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
                new TextRun({ text: "Page ", size: 18, font: "Calibri", color: "808080" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: "808080" }),
                new TextRun({ text: " of ", size: 18, font: "Calibri", color: "808080" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Calibri", color: "808080" }),
              ],
            }),
          ],
        }),
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "PRL SITE SOLUTIONS", bold: true, size: 56, font: "Calibri", color: "1F4E79" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Recruitment Specialists", size: 32, font: "Calibri", color: "808080" })],
        }),
        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Complete User Guide", bold: true, size: 44, font: "Calibri", color: "2E75B6" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "The Dummies Guide to Managing Contractors", size: 28, font: "Calibri", color: "808080", italics: true })],
        }),
        spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Written so simply, a 12-year-old could follow it!", size: 24, font: "Calibri", color: "548235", bold: true })],
        }),
        spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Version 1.0  |  March 2026`, size: 22, font: "Calibri", color: "808080" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "CONFIDENTIAL - For PRL Staff and Contractors Only", size: 20, font: "Calibri", color: "C00000", bold: true })],
        }),

        // ═══ TABLE OF CONTENTS ═══
        pageBreakPara(),
        heading1("Table of Contents"),
        para("Open this document in Microsoft Word and press Ctrl+A then F9 to update the table of contents below. The page numbers will fill in automatically."),
        spacer(),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),

        // ═══ SECTION 1: LOGGING IN ═══
        pageBreakPara(),
        heading1("1. Logging In"),
        para("This is the first thing you will do every time you use the system. Don't worry, it is dead simple!"),
        spacer(),

        heading2("1.1 Staff Login"),
        para("Staff members use their PRL email addresses. There are three types of staff accounts:"),
        bulletPoint([{ text: "admin@prlsitesolutions.co.uk", bold: true }, { text: " - Full access to everything. The boss account!" }]),
        bulletPoint([{ text: "adella@prlsitesolutions.co.uk", bold: true }, { text: " - Standard staff access for day-to-day work." }]),
        bulletPoint([{ text: "accounts@prlsitesolutions.co.uk", bold: true }, { text: " - Accounts team access, focused on billing and timesheets." }]),
        spacer(),
        para("Here is how to sign in:"),
        numberedStep(1, [{ text: "Open your web browser (Chrome, Edge, Safari - any will do)." }]),
        numberedStep(2, [{ text: "Go to the PRL webapp URL (your manager will give you this)." }]),
        numberedStep(3, [{ text: "You will see the PRL logo and a sign-in box." }]),
        numberedStep(4, [{ text: "Type your ", bold: false }, { text: "email address", bold: true }, { text: " in the Email box." }]),
        numberedStep(5, [{ text: "Type your ", bold: false }, { text: "password", bold: true }, { text: " in the Password box." }]),
        numberedStep(6, [{ text: "Click the big blue ", bold: false }, { text: '"Sign in"', bold: true }, { text: " button." }]),
        numberedStep(7, [{ text: "You will land on the Dashboard. You are in!" }]),
        topTip("Bookmark the login page in your browser so you can find it quickly next time."),
        watchOut("If you see \"Invalid email or password\" - double-check for typos. Passwords are case-sensitive, so make sure Caps Lock is off!"),
        spacer(),

        heading2("1.2 Contractor Login"),
        para("Contractors have their own separate login. When a contractor is added to the system, they automatically get a login created for them."),
        numberedStep(1, [{ text: "Go to the same webapp URL." }]),
        numberedStep(2, [{ text: "Enter the email address that PRL registered you with." }]),
        numberedStep(3, [{ text: "Enter your password (sent to you by email when your account was created)." }]),
        numberedStep(4, [{ text: 'Click ', bold: false }, { text: '"Sign in"', bold: true }, { text: "." }]),
        numberedStep(5, [{ text: "You will be taken to the Contractor Portal (a simpler version of the system just for you)." }]),
        commonQuestion("I never received my login details?", "Ask your PRL contact to check your email address is correct in the system. They can resend your details."),

        // ═══ SECTION 2: FORGOT PASSWORD ═══
        pageBreakPara(),
        heading1("2. Forgot Password"),
        para("Forgotten your password? No stress! Here is how to reset it:"),
        numberedStep(1, [{ text: "Go to the login page." }]),
        numberedStep(2, [{ text: 'Click the ', bold: false }, { text: '"Forgot your password?"', bold: true }, { text: " link below the Sign in button." }]),
        numberedStep(3, [{ text: "A new box will appear asking for your email." }]),
        numberedStep(4, [{ text: "Type in the ", bold: false }, { text: "email address", bold: true }, { text: " linked to your account." }]),
        numberedStep(5, [{ text: 'Click the ', bold: false }, { text: '"Send"', bold: true }, { text: " button." }]),
        numberedStep(6, [{ text: "You will see a green message saying a reset link has been sent." }]),
        numberedStep(7, [{ text: "Check your email inbox (and spam/junk folder!)." }]),
        numberedStep(8, [{ text: "Click the reset link in the email." }]),
        numberedStep(9, [{ text: "Enter your new password and confirm it." }]),
        numberedStep(10, [{ text: "Go back to the login page and sign in with your new password." }]),
        topTip("If the email does not arrive within 5 minutes, check your spam folder first. If it is still not there, try again or contact your PRL admin."),
        watchOut("If you see an error message about email not being found, it means there is no account with that email address. Double-check the spelling or ask your admin."),
        commonQuestion("Can I change my password without forgetting it?", "Currently, password changes go through the forgot password flow. Just use the reset link process above."),

        // ═══ SECTION 3: DASHBOARD ═══
        pageBreakPara(),
        heading1("3. Dashboard"),
        para("The Dashboard is your home page. Think of it as your mission control - one quick look tells you everything important about your workforce."),
        spacer(),

        heading2("3.1 The KPI Cards"),
        para("At the top, you will see six coloured cards. Here is what each one means:"),
        bulletPoint([{ text: "Total Contractors", bold: true }, { text: " - The total number of contractors registered in the system." }]),
        bulletPoint([{ text: "Active Assignments", bold: true }, { text: " - How many contractors are currently placed and working on jobs." }]),
        bulletPoint([{ text: "Pending Timesheets", bold: true }, { text: " - Timesheets waiting to be reviewed (Draft or Submitted status). If this number is high, someone needs to get approving!" }]),
        bulletPoint([{ text: "Compliance Alerts", bold: true }, { text: " - Documents that are expiring, expired, or non-compliant. RED ALERT territory - these need attention ASAP!" }]),
        bulletPoint([{ text: "Companies", bold: true }, { text: " - Total number of client companies you work with." }]),
        bulletPoint([{ text: "Active Suppliers", bold: true }, { text: " - Number of active supplier agencies providing contractors." }]),
        spacer(),

        heading2("3.2 Recent Contractors"),
        para("On the left side below the cards, you will see the 5 most recently added contractors. Each one shows their name, job title, status badge (Active/Inactive/On Hold), and when they were added."),
        spacer(),

        heading2("3.3 Compliance Alerts Panel"),
        para("On the right side, you will see a list of compliance issues sorted by urgency. The Compliance Score Ring in the corner gives you a quick percentage showing how compliant your workforce is overall."),
        topTip("Check the Dashboard first thing every morning. If Compliance Alerts are above zero, deal with those first!"),
        commonQuestion("What is a good compliance score?", "Aim for 90% or above. Below 80% means you have serious gaps that need fixing urgently."),

        // ═══ SECTION 4: INTELLIGENCE ═══
        pageBreakPara(),
        heading1("4. Intelligence"),
        para("This is the clever bit! The Intelligence module uses smart analysis to spot problems before they become disasters. Think of it as your early warning system."),
        spacer(),

        heading2("4.1 Workforce Insights (Main Page)"),
        para("When you click Intelligence in the menu, you will see:"),
        bulletPoint([{ text: "System Health panel", bold: true }, { text: " - Four category boxes (Compliance, Financial, Workforce, Operational). Green means healthy, amber means attention needed, red means action required." }]),
        bulletPoint([{ text: "Actionable Insights feed", bold: true }, { text: " - A list of alerts with colour-coded severity. Critical items are red, warnings are amber, info is blue, and success is green." }]),
        para("Each insight has a title, description, and sometimes a number (the metric). Many also have a \"View\" button that takes you straight to the relevant page to fix the issue."),
        spacer(),

        heading2("4.2 Smart Matching"),
        numberedStep(1, [{ text: 'Click the purple ', bold: false }, { text: '"Smart Matching"', bold: true }, { text: " button at the top of the Intelligence page." }]),
        numberedStep(2, [{ text: "The system analyses your contractors and available roles to find the best matches." }]),
        numberedStep(3, [{ text: "Review the suggested matches - the system scores each one." }]),
        para("This helps you quickly find the right contractor for a new assignment based on skills, location, and availability."),
        spacer(),

        heading2("4.3 Risk Engine"),
        numberedStep(1, [{ text: 'Click the amber ', bold: false }, { text: '"Risk Engine"', bold: true }, { text: " button." }]),
        numberedStep(2, [{ text: "You will see a risk assessment across your entire workforce." }]),
        numberedStep(3, [{ text: "Each risk is scored and categorised so you know what to tackle first." }]),
        spacer(),

        heading2("4.4 Anomaly Detection"),
        numberedStep(1, [{ text: 'Click the red ', bold: false }, { text: '"Anomalies"', bold: true }, { text: " button." }]),
        numberedStep(2, [{ text: "The system flags anything unusual - weird timesheet patterns, compliance gaps, billing oddities." }]),
        numberedStep(3, [{ text: "Review each anomaly and take action if needed." }]),
        topTip("Check the Intelligence page at least once a week. It catches things humans often miss!"),
        watchOut("A \"Critical\" alert means something needs fixing TODAY. Do not ignore red alerts!"),

        // ═══ SECTION 5: CONTRACTORS ═══
        pageBreakPara(),
        heading1("5. Contractors"),
        para("This is where you manage all your contractor records. Every person who works for PRL through a contract appears here."),
        spacer(),

        heading2("5.1 Viewing the Contractor List"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Contractors"', bold: true }, { text: " in the left-hand menu." }]),
        numberedStep(2, [{ text: "You will see a table showing every contractor with their name, email, job title, day rate, status, and supplier." }]),
        numberedStep(3, [{ text: "The list is sorted alphabetically by last name." }]),
        spacer(),

        heading2("5.2 Searching and Filtering"),
        numberedStep(1, [{ text: "Use the ", bold: false }, { text: "search box", bold: true }, { text: " at the top to type a name or email. It searches first name, last name, and email." }]),
        numberedStep(2, [{ text: "Use the ", bold: false }, { text: "status dropdown", bold: true }, { text: " to filter by Active, Inactive, or On Hold." }]),
        numberedStep(3, [{ text: 'Click ', bold: false }, { text: '"Filter"', bold: true }, { text: " to apply your search." }]),
        numberedStep(4, [{ text: "To clear filters, click the \"Clear filters\" link or go back to /contractors." }]),
        topTip("If you cannot find a contractor, try searching just their first name. The search is not fussy about upper/lower case."),
        spacer(),

        heading2("5.3 Adding a New Contractor"),
        numberedStep(1, [{ text: 'Click the blue ', bold: false }, { text: '"Add Contractor"', bold: true }, { text: " button in the top right." }]),
        numberedStep(2, [{ text: "Fill in the form: first name, last name, email, phone, job title, day rate, etc." }]),
        numberedStep(3, [{ text: "Select their supplier from the dropdown (if they come through an agency)." }]),
        numberedStep(4, [{ text: "Set their status (usually \"Active\" for new starters)." }]),
        numberedStep(5, [{ text: 'Click ', bold: false }, { text: '"Save"', bold: true }, { text: " at the bottom." }]),
        numberedStep(6, [{ text: "A contractor portal login is automatically created for them - they will be able to log in with their email!" }]),
        watchOut("Double-check the email address! This is how they will log into the contractor portal. A wrong email means they cannot access their account."),
        spacer(),

        heading2("5.4 Viewing and Editing a Contractor"),
        numberedStep(1, [{ text: 'Find the contractor in the list and click ', bold: false }, { text: '"View"', bold: true }, { text: " on the right." }]),
        numberedStep(2, [{ text: "You will see all their details, assignments, timesheets, and compliance records." }]),
        numberedStep(3, [{ text: "To edit, click the Edit button and update whatever needs changing." }]),
        numberedStep(4, [{ text: "Click Save when you are done." }]),
        commonQuestion("Can I delete a contractor?", "It is better to set their status to \"Inactive\" rather than deleting. This keeps the historical records intact."),

        // ═══ SECTION 6: COMPANIES ═══
        pageBreakPara(),
        heading1("6. Companies"),
        para("Companies are your clients - the businesses where contractors get placed to work."),
        spacer(),

        heading2("6.1 Viewing Companies"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Companies"', bold: true }, { text: " in the left-hand menu." }]),
        numberedStep(2, [{ text: "You will see a table with company name, city, contact name, contact email, phone, and active status." }]),
        spacer(),

        heading2("6.2 Searching"),
        numberedStep(1, [{ text: "Type in the search box to find a company by name." }]),
        numberedStep(2, [{ text: 'Click ', bold: false }, { text: '"Search"', bold: true }, { text: "." }]),
        spacer(),

        heading2("6.3 Adding a New Company"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Add Company"', bold: true }, { text: " (blue button, top right)." }]),
        numberedStep(2, [{ text: "Fill in the company name, address details, and contact information." }]),
        numberedStep(3, [{ text: 'Click ', bold: false }, { text: '"Save"', bold: true }, { text: "." }]),
        spacer(),

        heading2("6.4 Editing a Company"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"View"', bold: true }, { text: " next to the company you want to edit." }]),
        numberedStep(2, [{ text: "Make your changes." }]),
        numberedStep(3, [{ text: "Save." }]),
        topTip("Always fill in the contact email and phone. You will need these when chasing invoices or sorting compliance issues."),

        // ═══ SECTION 7: ASSIGNMENTS ═══
        pageBreakPara(),
        heading1("7. Assignments"),
        para("An assignment is the link between a contractor and a company. It says \"this person is working at this place, doing this role, from this date.\""),
        spacer(),

        heading2("7.1 The Kanban Board"),
        para("The main assignments page has a drag-and-drop Kanban board at the top. It has four columns:"),
        bulletPoint([{ text: "Placed", bold: true }, { text: " - Contractor has been matched to a role but has not started yet." }]),
        bulletPoint([{ text: "Active", bold: true }, { text: " - Contractor is currently working." }]),
        bulletPoint([{ text: "Ending", bold: true }, { text: " - Assignment is winding down or notice has been given." }]),
        bulletPoint([{ text: "Completed", bold: true }, { text: " - All done, assignment is finished." }]),
        spacer(),

        heading3("How to Drag Cards"),
        numberedStep(1, [{ text: "Find the assignment card you want to move." }]),
        numberedStep(2, [{ text: "Click and hold your mouse button down on the card." }]),
        numberedStep(3, [{ text: "While holding, drag it to the column you want." }]),
        numberedStep(4, [{ text: "Release the mouse button to drop it." }]),
        numberedStep(5, [{ text: "The status updates automatically. No need to save!" }]),
        topTip("The Kanban board is brilliant for Monday morning reviews. You can see at a glance where everyone is."),
        spacer(),

        heading2("7.2 Status Filter Pills"),
        para("Above the board, you will see filter pills: All, Placed, Active, Ending, Completed. Click any pill to show only assignments with that status."),
        spacer(),

        heading2("7.3 Creating a New Assignment"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"New Assignment"', bold: true }, { text: " (blue button, top right)." }]),
        numberedStep(2, [{ text: "Select the ", bold: false }, { text: "contractor", bold: true }, { text: " from the dropdown." }]),
        numberedStep(3, [{ text: "Select the ", bold: false }, { text: "company", bold: true }, { text: " they will be working at." }]),
        numberedStep(4, [{ text: "Enter the ", bold: false }, { text: "role title", bold: true }, { text: " (e.g., Site Manager, Electrician)." }]),
        numberedStep(5, [{ text: "Enter the ", bold: false }, { text: "location", bold: true }, { text: " and ", bold: false }, { text: "start date", bold: true }, { text: "." }]),
        numberedStep(6, [{ text: "Optionally add an end date." }]),
        numberedStep(7, [{ text: 'Click ', bold: false }, { text: '"Save"', bold: true }, { text: "." }]),
        spacer(),

        heading2("7.4 The Table View"),
        para("Below the Kanban board, there is a traditional table showing all assignments. This is handy when you need to see details like exact dates and locations at a glance. Click \"View\" on any row to see full details."),
        watchOut("Make sure you set an end date when you know one. This helps the system flag assignments that are about to end."),

        // ═══ SECTION 8: TIMESHEETS ═══
        pageBreakPara(),
        heading1("8. Timesheets"),
        para("Timesheets track how many hours each contractor works each week. Getting these right is critical because they drive billing and pay."),
        spacer(),

        heading2("8.1 Viewing Timesheets"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Timesheets"', bold: true }, { text: " in the menu." }]),
        numberedStep(2, [{ text: "You will see a count of total timesheets, exceptions, and auto-approved timesheets at the top." }]),
        numberedStep(3, [{ text: "Use the status filter pills (All, Draft, Submitted, Approved, Rejected) to narrow down the list." }]),
        numberedStep(4, [{ text: "The table shows contractor name, week starting, hours, overtime, status, and assignment." }]),
        spacer(),

        heading2("8.2 Creating a New Timesheet"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"New Timesheet"', bold: true }, { text: " (blue button, top right)." }]),
        numberedStep(2, [{ text: "Select the ", bold: false }, { text: "contractor", bold: true }, { text: "." }]),
        numberedStep(3, [{ text: "Select the ", bold: false }, { text: "assignment", bold: true }, { text: " this timesheet is for." }]),
        numberedStep(4, [{ text: "Pick the ", bold: false }, { text: "week starting date", bold: true }, { text: " (always a Monday)." }]),
        numberedStep(5, [{ text: "Enter hours for each day of the week." }]),
        numberedStep(6, [{ text: "The system automatically calculates the total hours and overtime." }]),
        numberedStep(7, [{ text: "Save as Draft or Submit for approval." }]),
        spacer(),

        heading2("8.3 Overtime Rules"),
        para("The system has built-in overtime calculations. Hours over the standard threshold automatically get flagged as overtime and highlighted in orange. Timesheets with overtime are called \"exceptions\" and get a special amber badge so approvers can easily spot them."),
        topTip("Timesheets flagged as exceptions need extra attention during approval. The amber \"Exception\" badge makes them easy to spot."),
        spacer(),

        heading2("8.4 Approving or Rejecting Timesheets"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"View"', bold: true }, { text: " on a Submitted timesheet." }]),
        numberedStep(2, [{ text: "Review the hours for each day." }]),
        numberedStep(3, [{ text: "If everything looks good, click ", bold: false }, { text: '"Approve"', bold: true }, { text: "." }]),
        numberedStep(4, [{ text: "If something is wrong, click ", bold: false }, { text: '"Reject"', bold: true }, { text: " and add a reason." }]),
        para("Some timesheets may show an \"Auto\" badge - these were automatically approved by the system based on approval chain rules."),
        spacer(),

        heading2("8.5 Approval Chains"),
        numberedStep(1, [{ text: 'Click the ', bold: false }, { text: '"Approval Chains"', bold: true }, { text: " button (gear icon, top right area)." }]),
        numberedStep(2, [{ text: "Here you can set up who needs to approve timesheets and in what order." }]),
        numberedStep(3, [{ text: "You can also set rules for auto-approval (e.g., timesheets under a certain number of hours get approved automatically)." }]),
        watchOut("Rejected timesheets go back to the contractor. Make sure you write a clear reason so they know what to fix!"),
        commonQuestion("What happens after a timesheet is approved?", "Approved timesheets can be used to generate invoices in the Billing section."),

        // ═══ SECTION 9: BILLING ═══
        pageBreakPara(),
        heading1("9. Billing & Invoices"),
        para("The Billing section handles everything to do with money. Invoices are generated from approved timesheets, so make sure your timesheets are sorted first!"),
        spacer(),

        heading2("9.1 Summary Cards"),
        para("At the top of the page, you will see three cards:"),
        bulletPoint([{ text: "Outstanding", bold: true }, { text: " - Total amount of unpaid approved/sent invoices (shown in amber)." }]),
        bulletPoint([{ text: "Paid (Total)", bold: true }, { text: " - Total amount already paid (shown in green)." }]),
        bulletPoint([{ text: "Draft", bold: true }, { text: " - Invoices still being prepared (shown in grey)." }]),
        spacer(),

        heading2("9.2 Invoice Statuses"),
        para("Invoices go through a lifecycle:"),
        bulletPoint([{ text: "Draft", bold: true }, { text: " - Just created, not yet ready." }]),
        bulletPoint([{ text: "Reconciling", bold: true }, { text: " - Being checked and matched." }]),
        bulletPoint([{ text: "Approved", bold: true }, { text: " - Ready to send." }]),
        bulletPoint([{ text: "Sent", bold: true }, { text: " - Sent to the client." }]),
        bulletPoint([{ text: "Paid", bold: true }, { text: " - Money received. Job done!" }]),
        bulletPoint([{ text: "Disputed", bold: true }, { text: " - Client has raised a query." }]),
        spacer(),

        heading2("9.3 Generating Invoices"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Generate Invoices"', bold: true }, { text: " (blue button, top right)." }]),
        numberedStep(2, [{ text: "The system finds all approved timesheets that have not been invoiced yet." }]),
        numberedStep(3, [{ text: "Select which timesheets to include." }]),
        numberedStep(4, [{ text: "Review the generated invoice details." }]),
        numberedStep(5, [{ text: "Confirm to create the invoice." }]),
        spacer(),

        heading2("9.4 Three-Way Matching"),
        para("You will notice a \"Match\" column in the invoices table. This shows whether the invoice matches up correctly across three things: the timesheet, the rate card, and the purchase order. Matched means everything lines up. Partial means something is off. Unmatched means there is a problem to investigate."),
        topTip("Green \"Matched\" is what you want to see. Amber \"Partial\" means check the rates. No match means investigate before sending!"),
        spacer(),

        heading2("9.5 Spend Dashboard"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Spend Dashboard"', bold: true }, { text: " (the chart icon button)." }]),
        numberedStep(2, [{ text: "See a visual breakdown of spending by company, period, and contractor." }]),
        numberedStep(3, [{ text: "Use this to spot trends and keep costs under control." }]),
        spacer(),

        heading2("9.6 Sage Export"),
        para("The billing system supports exporting data to Sage accounting software. Look for export/download buttons when viewing invoices."),
        watchOut("Always check the three-way match status before sending an invoice to a client. Sending a mismatched invoice is embarrassing and creates extra work!"),

        // ═══ SECTION 10: COMPLIANCE ═══
        pageBreakPara(),
        heading1("10. Compliance"),
        para("Compliance is arguably the MOST important section. It tracks whether your contractors have all the required documents, certifications, and checks they need to legally and safely work. Get this wrong and you could face huge fines."),
        spacer(),

        heading2("10.1 The Compliance Dashboard"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Compliance"', bold: true }, { text: " in the menu." }]),
        numberedStep(2, [{ text: "At the top you will see the Compliance Overview with the score ring showing your overall percentage." }]),
        numberedStep(3, [{ text: "Three summary cards show: Compliant (green), Expiring (amber), and Non-Compliant (red) counts." }]),
        spacer(),

        heading2("10.2 Compliance Types"),
        para("The system tracks these types of compliance records:"),
        bulletPoint([{ text: "Right to Work", bold: true }, { text: " - Proof the person can legally work in the UK." }]),
        bulletPoint([{ text: "DBS", bold: true }, { text: " - Criminal record check (Disclosure and Barring Service)." }]),
        bulletPoint([{ text: "CSCS", bold: true }, { text: " - Construction Skills Certification Scheme card." }]),
        bulletPoint([{ text: "Insurance", bold: true }, { text: " - Professional indemnity or public liability insurance." }]),
        bulletPoint([{ text: "IR35 Assessment", bold: true }, { text: " - Tax status determination (inside or outside IR35)." }]),
        bulletPoint([{ text: "Qualification", bold: true }, { text: " - Relevant professional qualifications." }]),
        bulletPoint([{ text: "Other", bold: true }, { text: " - Anything else that needs tracking." }]),
        spacer(),

        heading2("10.3 Progress Bars"),
        para("Below the summary cards, you will see a progress bar for each compliance type. Each bar shows how many are verified out of the total, with colour coding to show the worst status in that category."),
        spacer(),

        heading2("10.4 Compliance Gaps"),
        para("If contractors are missing mandatory requirements, a red \"Compliance Gaps\" panel appears. This shows which contractor is missing what, and links directly to their profile so you can sort it."),
        spacer(),

        heading2("10.5 Adding a Compliance Record"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Add Record"', bold: true }, { text: " (blue button, top right)." }]),
        numberedStep(2, [{ text: "Select the contractor." }]),
        numberedStep(3, [{ text: "Choose the type (Right to Work, DBS, CSCS, etc)." }]),
        numberedStep(4, [{ text: "Enter the document name, reference number, issue date, and expiry date." }]),
        numberedStep(5, [{ text: "Set the status (Pending until verified)." }]),
        numberedStep(6, [{ text: "Save." }]),
        spacer(),

        heading2("10.6 Checklists and Requirements"),
        numberedStep(1, [{ text: 'Click the ', bold: false }, { text: '"Checklists"', bold: true }, { text: " button at the top." }]),
        numberedStep(2, [{ text: "Here you can manage which compliance types are mandatory for different roles." }]),
        numberedStep(3, [{ text: "This is what drives the Compliance Gaps detection." }]),
        spacer(),

        heading2("10.7 Filtering Compliance Records"),
        numberedStep(1, [{ text: "Use the search box to find records by contractor name." }]),
        numberedStep(2, [{ text: "Use the status dropdown (Verified, Pending, Expiring, Expired, Non-Compliant)." }]),
        numberedStep(3, [{ text: "Use the type dropdown to filter by compliance type." }]),
        numberedStep(4, [{ text: 'Click ', bold: false }, { text: '"Filter"', bold: true }, { text: "." }]),
        topTip("Set a calendar reminder to check compliance every Monday. Expiring documents can sneak up on you!"),
        watchOut("An \"Expired\" status means the document is out of date and the contractor should NOT be working until it is renewed. This is a legal requirement!"),
        commonQuestion("What is IR35?", "IR35 is UK tax legislation that determines whether a contractor is really a disguised employee. The system helps track whether each contractor has been assessed and their determination."),

        // ═══ SECTION 11: RATES ═══
        pageBreakPara(),
        heading1("11. Rates"),
        para("Rate cards set how much contractors get paid and how much you charge the client. The difference is your margin."),
        spacer(),

        heading2("11.1 Viewing Rate Cards"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Rates"', bold: true }, { text: " in the menu." }]),
        numberedStep(2, [{ text: "You will see a table showing: Role, Location, Pay/Hr, Charge/Hr, Margin %, and effective dates." }]),
        para("The margin percentage is colour-coded: green (30%+) is great, amber (20-30%) is okay, red (under 20%) needs attention."),
        spacer(),

        heading2("11.2 Adding a Rate Card"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Add Rate Card"', bold: true }, { text: " (blue button)." }]),
        numberedStep(2, [{ text: "Enter the role, location, pay rate per hour, and charge rate per hour." }]),
        numberedStep(3, [{ text: "The margin is calculated automatically." }]),
        numberedStep(4, [{ text: "Set the effective from date (and optionally an effective to date)." }]),
        numberedStep(5, [{ text: "Save." }]),
        spacer(),

        heading2("11.3 Editing a Rate Card"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Edit"', bold: true }, { text: " on the rate card row." }]),
        numberedStep(2, [{ text: "Update the rates as needed." }]),
        numberedStep(3, [{ text: "Save." }]),
        topTip("When rates change, create a new rate card with the new effective date rather than editing the old one. This keeps your historical data accurate."),
        watchOut("A margin below 20% (shown in red) means you are barely covering your costs. Review these rates urgently!"),

        // ═══ SECTION 12: SUPPLIERS ═══
        pageBreakPara(),
        heading1("12. Suppliers"),
        para("Suppliers are the agencies or umbrella companies that provide contractors to PRL. Each supplier has a performance score and tier."),
        spacer(),

        heading2("12.1 Viewing Suppliers"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Suppliers"', bold: true }, { text: " in the menu." }]),
        numberedStep(2, [{ text: "You will see supplier cards showing: name, tier badge, number of contractors, performance score bar, and contact details." }]),
        spacer(),

        heading2("12.2 Performance Scores"),
        para("Each supplier has a score out of 100:"),
        bulletPoint([{ text: "75+ (green bar)", bold: true }, { text: " - Great supplier, keep using them." }]),
        bulletPoint([{ text: "50-74 (amber bar)", bold: true }, { text: " - Average, room for improvement." }]),
        bulletPoint([{ text: "Below 50 (red bar)", bold: true }, { text: " - Poor performance, consider alternatives." }]),
        spacer(),

        heading2("12.3 Adding a Supplier"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Add Supplier"', bold: true }, { text: " (blue button)." }]),
        numberedStep(2, [{ text: "Enter the supplier name, contact details, and set their initial tier." }]),
        numberedStep(3, [{ text: "Save." }]),
        spacer(),

        heading2("12.4 Viewing Supplier Details"),
        numberedStep(1, [{ text: "Click on any supplier card to see their full details." }]),
        numberedStep(2, [{ text: "You can see all contractors linked to this supplier." }]),
        commonQuestion("What are the supplier tiers?", "Tiers help you categorise suppliers by importance and reliability. Higher tiers get priority when placing contractors."),

        // ═══ SECTION 13: ACTIVITY LOG ═══
        pageBreakPara(),
        heading1("13. Activity Log"),
        para("The Activity Log is your complete audit trail. Every action anyone takes in the system is recorded here. Think of it as CCTV for your data."),
        spacer(),

        heading2("13.1 Viewing the Log"),
        numberedStep(1, [{ text: 'Click ', bold: false }, { text: '"Activity Log"', bold: true }, { text: " in the menu." }]),
        numberedStep(2, [{ text: "You will see a list of all actions, newest first." }]),
        numberedStep(3, [{ text: "Each entry shows: who did it, what they did, which type of record was affected, details, and when." }]),
        spacer(),

        heading2("13.2 Understanding the Icons"),
        para("Each log entry has an icon showing what happened:"),
        bulletPoint([{ text: "+ (Created)", bold: true }, { text: " - Something new was added." }]),
        bulletPoint([{ text: "Pencil (Updated)", bold: true }, { text: " - Something was changed." }]),
        bulletPoint([{ text: "Tick (Approved)", bold: true }, { text: " - Something was approved." }]),
        bulletPoint([{ text: "X (Rejected)", bold: true }, { text: " - Something was rejected." }]),
        bulletPoint([{ text: "Arrow (Submitted)", bold: true }, { text: " - Something was submitted." }]),
        bulletPoint([{ text: "Key (Logged In)", bold: true }, { text: " - Someone signed in." }]),
        bulletPoint([{ text: "Download (Exported)", bold: true }, { text: " - Data was exported." }]),
        spacer(),

        heading2("13.3 Filtering the Log"),
        numberedStep(1, [{ text: "Use the ", bold: false }, { text: "User dropdown", bold: true }, { text: " to see actions by a specific person." }]),
        numberedStep(2, [{ text: "Use the ", bold: false }, { text: "Entity dropdown", bold: true }, { text: " to filter by type (Contractor, Timesheet, Invoice, etc)." }]),
        numberedStep(3, [{ text: 'Click ', bold: false }, { text: '"Filter"', bold: true }, { text: "." }]),
        para("The log supports pagination - use the page numbers at the bottom to browse through older entries (50 per page)."),
        topTip("If something goes wrong or someone says \"I didn't change that!\" - the Activity Log will tell you exactly who did what and when."),

        // ═══ SECTION 14: CONTRACTOR PORTAL ═══
        pageBreakPara(),
        heading1("14. Contractor Portal"),
        para("The Contractor Portal is a simpler, cut-down version of the system designed specifically for contractors. They can only see their own data."),
        spacer(),

        heading2("14.1 What Contractors See"),
        para("When a contractor logs in, they get their own portal with:"),
        bulletPoint([{ text: "Welcome message", bold: true }, { text: " with their name." }]),
        bulletPoint([{ text: "Quick Stats", bold: true }, { text: " - Three cards showing Draft Timesheets, Approved Timesheets, and Compliance Alerts." }]),
        bulletPoint([{ text: "Active Assignments", bold: true }, { text: " - Their current roles with company name, location, and status." }]),
        bulletPoint([{ text: "Recent Timesheets", bold: true }, { text: " - Their last 5 timesheets with status badges." }]),
        bulletPoint([{ text: "Compliance Alerts", bold: true }, { text: " - Any documents that are expiring or expired (shown in red)." }]),
        spacer(),

        heading2("14.2 Submitting Timesheets (as a Contractor)"),
        numberedStep(1, [{ text: "Log into the portal." }]),
        numberedStep(2, [{ text: 'Click ', bold: false }, { text: '"View all"', bold: true }, { text: " next to Recent Timesheets, or navigate to Timesheets." }]),
        numberedStep(3, [{ text: "Find your draft timesheet or create a new one." }]),
        numberedStep(4, [{ text: "Enter your hours for each day of the week." }]),
        numberedStep(5, [{ text: "Review the total." }]),
        numberedStep(6, [{ text: "Submit for approval." }]),
        numberedStep(7, [{ text: "Wait for PRL staff to approve or reject it." }]),
        topTip("Contractors should submit their timesheets every Friday before they leave site. The earlier the better!"),
        spacer(),

        heading2("14.3 Checking Compliance (as a Contractor)"),
        numberedStep(1, [{ text: "Look at the Compliance Alerts section on the portal dashboard." }]),
        numberedStep(2, [{ text: "If any documents show as Expiring or Expired, contact PRL immediately to provide updated documents." }]),
        numberedStep(3, [{ text: "Navigate to the compliance section for full details of all your records." }]),
        watchOut("Contractors: If your compliance shows red alerts, you may not be allowed on site until they are resolved. Do not ignore these!"),
        commonQuestion("Can contractors edit their own compliance records?", "No. Contractors can only view their compliance status. PRL staff manage the records to ensure accuracy."),

        // ═══ SECTION 15: MOBILE ═══
        pageBreakPara(),
        heading1("15. Using on Mobile"),
        para("Great news - the entire webapp works on your phone! The design automatically adjusts to fit smaller screens."),
        spacer(),

        heading2("15.1 Mobile Navigation"),
        numberedStep(1, [{ text: "On mobile, the sidebar menu is hidden. Tap the ", bold: false }, { text: "hamburger menu icon", bold: true }, { text: " (three horizontal lines) at the top left." }]),
        numberedStep(2, [{ text: "The menu slides out from the left." }]),
        numberedStep(3, [{ text: "Tap any menu item to navigate there." }]),
        numberedStep(4, [{ text: "The menu automatically closes when you select something." }]),
        numberedStep(5, [{ text: "To sign out on mobile, tap the ", bold: false }, { text: "logout icon", bold: true }, { text: " in the top right corner of the mobile bar." }]),
        spacer(),

        heading2("15.2 Adding to Home Screen (PWA)"),
        para("You can add the webapp to your phone's home screen so it feels like a real app:"),
        spacer(),
        heading3("On iPhone (Safari)"),
        numberedStep(1, [{ text: "Open the webapp in Safari." }]),
        numberedStep(2, [{ text: "Tap the ", bold: false }, { text: "Share button", bold: true }, { text: " (the square with an arrow pointing up)." }]),
        numberedStep(3, [{ text: "Scroll down and tap ", bold: false }, { text: '"Add to Home Screen"', bold: true }, { text: "." }]),
        numberedStep(4, [{ text: "Give it a name (e.g., \"PRL\") and tap Add." }]),
        numberedStep(5, [{ text: "You will now see a PRL icon on your home screen!" }]),
        spacer(),
        heading3("On Android (Chrome)"),
        numberedStep(1, [{ text: "Open the webapp in Chrome." }]),
        numberedStep(2, [{ text: "Tap the ", bold: false }, { text: "three dots menu", bold: true }, { text: " at the top right." }]),
        numberedStep(3, [{ text: 'Tap ', bold: false }, { text: '"Add to Home screen"', bold: true }, { text: "." }]),
        numberedStep(4, [{ text: "Tap Add to confirm." }]),
        numberedStep(5, [{ text: "Done! Open it like any other app." }]),
        topTip("Adding to your home screen makes the app launch full-screen without the browser address bar. It looks and feels like a native app!"),
        commonQuestion("Does it work offline?", "No - you need an internet connection to use the webapp. But it works great on 4G/5G mobile data."),

        // ═══ SECTION 16: TROUBLESHOOTING ═══
        pageBreakPara(),
        heading1("16. Troubleshooting & FAQ"),
        para("Something not working? Here are the most common issues and how to fix them."),
        spacer(),

        heading2("16.1 Login Problems"),
        commonQuestion("I cannot log in - it says invalid email or password.", "Double-check your email address for typos. Make sure Caps Lock is off. Try the Forgot Password flow to reset your password."),
        commonQuestion("The page just shows a blank white screen.", "Try refreshing the page (press F5 or Ctrl+R). If that does not work, clear your browser cache or try a different browser."),
        commonQuestion("I got logged out randomly.", "Sessions expire after a period of inactivity. Just log back in. Your data is safe."),
        spacer(),

        heading2("16.2 Timesheet Issues"),
        commonQuestion("I cannot see the contractor I want when creating a timesheet.", "The contractor must be in the system first. Go to Contractors and add them, then come back to create the timesheet."),
        commonQuestion("A timesheet was rejected - what do I do?", "Open the rejected timesheet, check the rejection reason, fix the hours, and resubmit."),
        commonQuestion("What counts as overtime?", "Overtime is any hours over the standard weekly or daily threshold set up in the system. These are highlighted in orange automatically."),
        spacer(),

        heading2("16.3 Billing Issues"),
        commonQuestion("No invoices are being generated.", "Make sure there are approved timesheets that have not been invoiced yet. Invoices are only generated from approved timesheets."),
        commonQuestion("An invoice shows as Disputed.", "Contact the client to find out what the issue is. Check the timesheet and rates match up. Resolve the dispute and update the status."),
        commonQuestion("What is three-way matching?", "It checks that the timesheet hours, the rate card prices, and the purchase order all match up. Green = matched, Amber = partially matched, Grey = not matched."),
        spacer(),

        heading2("16.4 Compliance Issues"),
        commonQuestion("A contractor shows as Non-Compliant but their documents are up to date.", "Make sure the expiry date in the compliance record is correct. The system automatically flags records as expired based on the date."),
        commonQuestion("How do I update an expired document?", "Add a new compliance record with the updated document details and new expiry date. The old record stays for audit purposes."),
        spacer(),

        heading2("16.5 General Tips"),
        bulletPoint([{ text: "Use Chrome or Edge", bold: true }, { text: " for the best experience." }]),
        bulletPoint([{ text: "Clear your cache", bold: true }, { text: " if things look odd (Ctrl+Shift+Delete)." }]),
        bulletPoint([{ text: "Check your internet connection", bold: true }, { text: " if pages are slow to load." }]),
        bulletPoint([{ text: "Use the search and filter features", bold: true }, { text: " - they are there to save you time!" }]),
        bulletPoint([{ text: "Bookmark the main URL", bold: true }, { text: " so you can get to it quickly." }]),
        spacer(),

        heading2("16.6 Getting Help"),
        para("If you are stuck and this guide has not answered your question:"),
        numberedStep(1, [{ text: "Check the Activity Log to see if something unexpected happened." }]),
        numberedStep(2, [{ text: "Ask a colleague - they might have seen the same issue before." }]),
        numberedStep(3, [{ text: "Contact your PRL system administrator." }]),
        numberedStep(4, [{ text: "Describe what you were doing, what you expected to happen, and what actually happened." }]),
        topTip("When reporting a problem, take a screenshot! It makes it ten times easier for someone to help you."),
        spacer(),
        spacer(),

        // ═══ END NOTE ═══
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [
            new TextRun({ text: "--- End of Guide ---", bold: true, size: 24, font: "Calibri", color: "808080" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "PRL Site Solutions | Recruitment Specialists | March 2026", size: 20, font: "Calibri", color: "808080" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "You have got this! If you have read this far, you are already a pro.", size: 22, font: "Calibri", color: "2E75B6", bold: true }),
          ],
        }),
      ],
    },
  ],
});

// ─── Generate the file ──────────────────────────────────────────────

Packer.toBuffer(doc).then((buffer) => {
  const outputPath = __dirname + "/PRL_Complete_User_Guide.docx";
  fs.writeFileSync(outputPath, buffer);
  console.log("Guide generated successfully!");
  console.log("Output: " + outputPath);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
});
