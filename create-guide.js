const docx = require("docx");
const fs = require("fs");

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  TableOfContents,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Tab,
  TabStopType,
  TabStopPosition,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  StyleLevel,
  LevelFormat,
} = docx;

// ─── Colour palette ────────────────────────────────────────────────
const BLUE = "1E40AF";
const LIGHT_BLUE = "DBEAFE";
const ORANGE = "EA580C";
const LIGHT_ORANGE = "FFF7ED";
const GREEN = "15803D";
const LIGHT_GREEN = "F0FDF4";
const GREY = "6B7280";
const DARK = "111827";
const WHITE = "FFFFFF";
const PRL_BLUE = "2563EB";

// ─── Helper: coloured callout box ──────────────────────────────────
function calloutBox(label, text, bgColour, textColour) {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: bgColour },
    border: {
      top: { style: BorderStyle.SINGLE, size: 1, color: textColour },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: textColour },
      left: { style: BorderStyle.SINGLE, size: 6, color: textColour },
      right: { style: BorderStyle.SINGLE, size: 1, color: textColour },
    },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color: textColour, size: 20, font: "Calibri" }),
      new TextRun({ text, color: textColour, size: 20, font: "Calibri" }),
    ],
  });
}

function topTip(text) {
  return calloutBox("TOP TIP", text, LIGHT_BLUE, BLUE);
}

function watchOut(text) {
  return calloutBox("WATCH OUT", text, LIGHT_ORANGE, ORANGE);
}

function commonQuestion(q, a) {
  return calloutBox("COMMON QUESTION", `${q} -- ${a}`, LIGHT_GREEN, GREEN);
}

// ─── Helper: numbered step ─────────────────────────────────────────
function step(num, text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: `${num}. `, bold: true, color: PRL_BLUE, size: 22, font: "Calibri" }),
      new TextRun({ text, size: 22, font: "Calibri", color: DARK }),
    ],
  });
}

// ─── Helper: body paragraph ────────────────────────────────────────
function body(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Calibri", color: DARK })],
  });
}

function bodyBold(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Calibri", color: DARK, bold: true })],
  });
}

// ─── Helper: headings ──────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Calibri", color: BLUE })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Calibri", color: PRL_BLUE })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Calibri", color: DARK })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function spacer() {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] });
}

// ─── Build the document ────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: DARK },
      },
    },
  },
  sections: [
    // ════════════════════════════════════════════════════════════════
    //  COVER PAGE
    // ════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
          margin: { top: convertInchesToTwip(1), bottom: convertInchesToTwip(1), left: convertInchesToTwip(1.2), right: convertInchesToTwip(1.2) },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: "PRL Site Solutions", italics: true, size: 18, color: GREY, font: "Calibri" })],
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
                new TextRun({ text: "Page ", size: 18, color: GREY, font: "Calibri" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY, font: "Calibri" }),
                new TextRun({ text: " of ", size: 18, color: GREY, font: "Calibri" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY, font: "Calibri" }),
              ],
            }),
          ],
        }),
      },
      children: [
        spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "PRL SITE SOLUTIONS", bold: true, size: 52, font: "Calibri", color: BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Recruitment Specialists", italics: true, size: 28, font: "Calibri", color: GREY })],
        }),
        spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "COMPLETE USER GUIDE", bold: true, size: 44, font: "Calibri", color: PRL_BLUE })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Contractor Management System", size: 28, font: "Calibri", color: DARK })],
        }),
        spacer(), spacer(), spacer(), spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `Version 2.0  |  March 2026`, size: 22, font: "Calibri", color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100 },
          children: [new TextRun({ text: "CONFIDENTIAL - For Internal Use Only", bold: true, size: 20, font: "Calibri", color: ORANGE })],
        }),

        // ══════════════════════════════════════════════════════════
        //  TABLE OF CONTENTS
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("Table of Contents"),
        body("Use Ctrl+A then F9 in Microsoft Word to update page numbers after opening this document."),
        spacer(),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),

        // ══════════════════════════════════════════════════════════
        //  1. GETTING STARTED
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("1. Getting Started"),

        h2("1.1 About This Guide"),
        body("This guide covers every feature of the PRL Site Solutions Contractor Management System. The system is a web application accessible from any modern browser on desktop, tablet, or mobile phone. It has two main portals:"),
        body("  - Staff Dashboard: The full management interface for PRL staff (Marianne, Jenni, Helen, Accounts, Keenan, Adella)."),
        body("  - Contractor Portal: A self-service portal for contractors to submit timesheets, upload documents, track compliance, and view their profile."),

        h2("1.2 System Requirements"),
        body("The system works in Google Chrome, Microsoft Edge, Safari, or Firefox. It is fully responsive and works on mobile phones with a slide-out navigation menu and bottom navigation bar. The system is also a Progressive Web App (PWA) that can be installed on a phone's home screen for an app-like experience."),
        topTip("On your phone, open the site in Chrome or Safari, tap 'Add to Home Screen' to get an app icon. This gives you full-screen access without the browser bar."),

        h2("1.3 Logging In"),
        body("Navigate to the login page. You will see the PRL Site Solutions logo and a simple login form."),
        step(1, "Enter your email address (e.g. marianne@prlsitesolutions.co.uk for staff, or your contractor email)."),
        step(2, "Enter your password."),
        step(3, "Click 'Sign in'."),
        step(4, "Staff users are taken to the main Dashboard. Contractors are taken to their Contractor Portal dashboard."),
        watchOut("If you see 'Invalid email or password', double-check your email and password. Remember passwords are case-sensitive."),

        h2("1.4 Forgot Password"),
        body("If you have forgotten your password, you can reset it from the login page."),
        step(1, "On the login page, click 'Forgot your password?' below the Sign in button."),
        step(2, "Enter your email address in the field that appears."),
        step(3, "Click 'Send'. The system will email you a password reset link."),
        step(4, "Check your inbox for an email from PRL Site Solutions. Click the link in the email."),
        step(5, "You will be taken to the 'Set Your Password' page. Enter your new password (minimum 6 characters) and confirm it."),
        step(6, "Click 'Set Password'. You will see a success message."),
        step(7, "Click 'Go to Login' and sign in with your new password."),
        topTip("The reset link is valid for 24 hours. If it expires, simply request a new one."),
        commonQuestion("I didn't receive the reset email -- what do I do?", "Check your spam/junk folder. The email comes from PRL Site Solutions. If still not found, contact Marianne or your admin to have them trigger the setup-staff or contractor-logins process again."),

        h2("1.5 Staff User Account Setup"),
        body("Staff accounts are provisioned by calling the setup-staff API endpoint with the setup key. This creates accounts for all PRL staff members with temporary passwords. Each staff member should then use the 'Forgot Password' flow on the login page to set their own secure password."),
        step(1, "An admin visits the setup-staff API URL with the correct key parameter."),
        step(2, "The system creates user accounts for all listed PRL staff (Marianne, Jenni, Helen, Accounts, Keenan, Adella)."),
        step(3, "Each staff member goes to the login page and clicks 'Forgot your password?'"),
        step(4, "They receive an email with a link to set their own password."),
        watchOut("Never share the setup key publicly. This endpoint is for initial provisioning only."),

        // ══════════════════════════════════════════════════════════
        //  2. DASHBOARD
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("2. Staff Dashboard"),

        h2("2.1 Overview"),
        body("The Dashboard is the first page you see after logging in. It provides an at-a-glance summary of your entire contractor workforce with six clickable KPI cards, a Recent Contractors list, and a Compliance Alerts panel."),

        h2("2.2 KPI Cards"),
        body("The top of the Dashboard displays six key performance indicator cards. Each card is clickable and takes you directly to the relevant module:"),
        body("  - Total Contractors: Shows the total number of contractors in the system. Clicking navigates to the Contractors page."),
        body("  - Active Assignments: Shows the count of currently active assignments. Clicking navigates to Assignments."),
        body("  - Pending Timesheets: Shows timesheets in Draft or Submitted status awaiting action. Clicking navigates to Timesheets filtered to Submitted."),
        body("  - Compliance Alerts: Shows the count of Expiring, Expired, or Non-Compliant compliance records. Clicking navigates to Compliance filtered to Expiring."),
        body("  - Companies: Shows total client companies. Clicking navigates to Companies."),
        body("  - Active Suppliers: Shows the number of active suppliers. Clicking navigates to Suppliers."),
        topTip("Click any KPI card to jump straight to the relevant module. The numbers update in real-time every time you load the Dashboard."),

        h2("2.3 Recent Contractors"),
        body("Below the KPI cards on the left, the Dashboard shows the five most recently added contractors with their name, job title, status badge, and date added. Click any contractor row to view their full profile. Click 'View all' to go to the full Contractors list."),

        h2("2.4 Compliance Alerts"),
        body("On the right side, the Compliance Alerts panel shows the five most urgent compliance issues (sorted by expiry date, earliest first). Each alert shows the contractor name, compliance type, expiry date, and status badge. A compliance score ring shows the overall percentage of verified records. Click any alert to view the full compliance record, or click 'View all' to go to the Compliance Dashboard."),
        watchOut("Red compliance alerts mean a contractor's document has expired or is non-compliant. Address these immediately to avoid compliance risk on active sites."),

        // ══════════════════════════════════════════════════════════
        //  3. SIDEBAR & NAVIGATION
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("3. Navigation & Sidebar"),

        h2("3.1 Desktop Sidebar"),
        body("On desktop, a fixed sidebar appears on the left side of the screen. It shows the PRL Site Solutions logo, your signed-in email, and navigation links to all modules:"),
        body("Dashboard, Intelligence, Contractors, Companies, Assignments, Timesheets, Billing, Compliance, Rates, Suppliers, Activity Log."),
        body("The currently active page is highlighted in blue. At the bottom, a Sign out button lets you log out."),

        h2("3.2 Live Badge Notifications"),
        body("Three sidebar items display live notification badges that update automatically every 30 seconds:"),
        body("  - Timesheets: A red pulsing badge shows the count of pending timesheets (Draft + Submitted) that need attention."),
        body("  - Billing: A blue badge shows the count of draft invoices waiting to be processed."),
        body("  - Compliance: An orange badge shows the count of compliance alerts (Expiring, Expired, Non-Compliant records)."),
        topTip("These badges update automatically every 30 seconds without needing to refresh the page. If the badge count drops to zero, the badge disappears."),

        h2("3.3 Mobile Navigation"),
        body("On mobile devices, the sidebar is hidden by default. A top bar shows the PRL logo, company name, a hamburger menu button, and a logout button."),
        step(1, "Tap the hamburger menu (three lines) in the top-left to open the slide-out navigation drawer."),
        step(2, "The navigation drawer slides in from the left with all the same menu items as the desktop sidebar."),
        step(3, "Tap any menu item to navigate. The drawer closes automatically."),
        step(4, "Tap the X button or tap outside the drawer to close it."),
        body("When there are pending timesheets, a small red pulsing dot appears on the hamburger menu icon to alert you."),
        body("The logout button is always visible in the top-right corner of the mobile top bar for quick access."),
        topTip("Use the PWA 'Add to Home Screen' feature for the best mobile experience. The app loads faster and feels native."),

        // ══════════════════════════════════════════════════════════
        //  4. INTELLIGENCE MODULE
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("4. Workforce Intelligence"),

        h2("4.1 Intelligence Hub"),
        body("The Intelligence page provides AI-powered insights and predictions across your entire workforce. It analyses your data to detect patterns, risks, and opportunities automatically."),
        body("At the top, three quick-link buttons take you to the sub-modules: Smart Matching, Risk Engine, and Anomalies."),
        body("The System Health panel shows four category indicators (Compliance, Financial, Workforce, Operational), each colour-coded green (healthy), amber (attention), or red (action needed)."),
        body("Below that, an Actionable Insights feed lists all detected insights sorted by severity (critical first). Each insight shows a severity-coloured card with category icon, title, description, trend arrow, metric value, and an action button linking to the relevant module."),

        h2("4.2 Smart Contractor Matching"),
        body("The Smart Matching page helps you find the best contractor for a specific role using an AI scoring system."),
        step(1, "Navigate to Intelligence and click 'Smart Matching' (or go to /intelligence/matching)."),
        step(2, "Enter the Role Required (e.g. 'Electrician'). The field auto-suggests from existing assignment roles."),
        step(3, "Optionally enter a Location and Max Rate per hour."),
        step(4, "Click 'Find Best Match'."),
        step(5, "Results appear ranked by match score (0-100). Each result shows the contractor name, IR35 status, charge rate, compliance percentage, availability, and a breakdown of five scoring factors (Skills, Compliance, Rate, Availability, History)."),
        step(6, "Click 'View Profile' to see the full contractor record."),
        topTip("The matching algorithm considers job title similarity, compliance status, rate budget, current availability, and past assignment history to produce an overall score."),

        h2("4.3 Predictive Risk Engine"),
        body("The Risk Engine forecasts compliance gaps, staffing shortfalls, and financial risks before they happen."),
        body("The page shows a Risk Score (lower is better), counts of Critical, High, and Medium/Low risks, then groups all risks by category (Compliance, Financial, Staffing). Each risk shows severity, title, description, probability percentage, impact level, due date, and an action button."),
        watchOut("Critical risks require immediate action. Check the Risk Engine regularly, especially before month-end or major project deadlines."),

        h2("4.4 Anomaly Detection"),
        body("The Anomaly Detection page automatically flags unusual patterns across your data. It detects:"),
        body("  - Excessive Hours: Timesheets with more than 60 hours per week."),
        body("  - Zero Hours: Timesheets submitted with 0 hours."),
        body("  - Duplicates: Multiple timesheets for the same contractor in the same week."),
        body("  - Hour Spikes: Hours more than 50% above a contractor's average."),
        body("  - PO Mismatch: Invoices without a linked Purchase Order."),
        body("  - Expired Active: Contractors on active assignments with expired compliance documents."),
        body("Anomalies are grouped by type (Timesheet, Billing, Compliance, Pattern) and colour-coded by severity with data points and 'Investigate' links."),

        // ══════════════════════════════════════════════════════════
        //  5. CONTRACTORS
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("5. Contractors"),

        h2("5.1 Contractor List"),
        body("The Contractors page shows a searchable, filterable table of all contractors in the system. Columns include Name (with initials avatar), Email, Job Title, Day Rate, Status, Supplier, and Actions."),

        h2("5.2 Searching and Filtering"),
        step(1, "Type a name or email in the search box."),
        step(2, "Optionally select a status filter (Active, Inactive, On Hold) from the dropdown."),
        step(3, "Click 'Filter' to apply."),
        step(4, "To clear filters, click 'Clear filters' or navigate back to /contractors."),

        h2("5.3 Adding a New Contractor"),
        step(1, "Click the blue 'Add Contractor' button in the top right."),
        step(2, "Fill in the contractor details: First Name, Last Name, Email, Phone, Job Title, Day Rate, NI Number, UTR Number, IR35 Status, Status, Supplier, and Notes."),
        step(3, "Click 'Save' to create the contractor record."),
        step(4, "The system automatically creates a Contractor Login account, allowing the contractor to access the Contractor Portal. They will need to use the 'Forgot Password' flow to set their password."),
        topTip("When you add a contractor via the dashboard, a portal login account is auto-created for them. Just tell them to visit the login page and click 'Forgot Password' to set up their access."),

        h2("5.4 Viewing a Contractor"),
        body("Click 'View' on any contractor row to see their full profile, including all personal details, assigned supplier, IR35 status, day rate, notes, and links to their assignments and compliance records."),

        h2("5.5 Editing a Contractor"),
        step(1, "From the contractor profile page, click 'Edit'."),
        step(2, "Update any fields as needed."),
        step(3, "Click 'Save' to apply changes."),

        h2("5.6 IR35 Assessment"),
        body("Each contractor has a dedicated IR35 assessment page accessible from their profile. This page tracks the contractor's IR35 determination (Inside, Outside, or Undetermined) and related assessment details."),
        watchOut("Always ensure IR35 status is correctly recorded. Incorrect determinations can lead to significant tax liabilities for PRL or the client company."),

        // ══════════════════════════════════════════════════════════
        //  6. COMPANIES
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("6. Companies"),

        h2("6.1 Company List"),
        body("The Companies page shows all client companies in a searchable table with columns: Name, City, Contact Name, Contact Email, Phone, Active status, and Actions."),

        h2("6.2 Searching Companies"),
        step(1, "Type a company name in the search box."),
        step(2, "Click 'Search' to filter."),
        step(3, "Click 'Clear search' to remove the filter."),

        h2("6.3 Adding a New Company"),
        step(1, "Click the blue 'Add Company' button."),
        step(2, "Fill in the company details: Name, Address, City, Postcode, Contact Name, Contact Email, Contact Phone, and Active status."),
        step(3, "Click 'Save'."),

        h2("6.4 Viewing and Editing a Company"),
        body("Click 'View' on any company row to see full details. From the detail page, click 'Edit' to modify the company record."),
        topTip("Keep company contact details up to date. These are used when generating invoices and in compliance gap reporting."),

        // ══════════════════════════════════════════════════════════
        //  7. ASSIGNMENTS
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("7. Assignments"),

        h2("7.1 Overview"),
        body("The Assignments page has two views: a visual Kanban Board at the top and a detailed table below. Assignments flow through four statuses: Placed, Active, Ending, and Completed."),

        h2("7.2 Kanban Board"),
        body("The Kanban board displays assignment cards in four columns, one per status. Each card shows the contractor name, company, role, location, and start date."),
        h3("7.2.1 Drag and Drop"),
        step(1, "Click and hold an assignment card (or long-press on mobile)."),
        step(2, "Drag the card to a different status column."),
        step(3, "Drop the card in the target column. A 'Drop here!' indicator appears when you hover over a valid drop zone."),
        step(4, "The status updates immediately (optimistic update) and saves to the server. A 'Saving...' indicator appears briefly."),
        topTip("Drag and drop works on both desktop (mouse) and mobile (touch). On mobile, long-press for 200ms to start dragging."),
        watchOut("If the server save fails, the card automatically snaps back to its original column and an error message appears."),

        h3("7.2.2 Search and Company Filter"),
        step(1, "Use the search box above the Kanban board to filter by contractor name or role."),
        step(2, "Use the company dropdown to filter by a specific company."),
        step(3, "The filter count shows 'X of Y shown' when filters are active."),
        step(4, "Click 'Clear filters' to reset."),

        h2("7.3 Status Filter Pills"),
        body("Below the page header, status filter pills (All, Placed, Active, Ending, Completed) filter the table view. The Kanban board always shows all assignments regardless of the table filter."),

        h2("7.4 Assignment Table"),
        body("The table view shows columns: Contractor, Company, Role, Location, Start Date, End Date, Status, and Actions. Click 'View' to see full assignment details."),

        h2("7.5 Creating a New Assignment"),
        step(1, "Click the blue 'New Assignment' button."),
        step(2, "Select a Contractor and Company from the dropdowns."),
        step(3, "Enter the Role, Location, Start Date, End Date (optional), and Status."),
        step(4, "Click 'Save'."),

        h2("7.6 Editing an Assignment"),
        body("From the assignment detail page, click 'Edit' to update any fields."),

        // ══════════════════════════════════════════════════════════
        //  8. TIMESHEETS
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("8. Timesheets"),

        h2("8.1 Overview"),
        body("The Timesheets page displays all timesheets grouped by week with summary cards, status filters, and collapsible weekly groups. At the top, two action buttons: 'Approval Chains' (gear icon) to configure approval workflows, and 'New Timesheet' to create a timesheet."),

        h2("8.2 Summary Cards"),
        body("Four summary cards show at the top of the page:"),
        body("  - Total: All timesheets matching the current filter."),
        body("  - Awaiting Approval: Timesheets in Submitted status (orange)."),
        body("  - Draft: Timesheets still being prepared (blue)."),
        body("  - Approved: Timesheets that have been approved (green)."),

        h2("8.3 Status Filter Pills"),
        body("Filter timesheets by clicking: All, Draft, Submitted, Approved, or Rejected. The active filter is highlighted in blue."),

        h2("8.4 Weekly Collapsible Groups"),
        body("Timesheets are grouped by the week starting date. Each week group is collapsible -- click the week header to expand or collapse it. Within each group, timesheets are shown as rows with contractor name, company, total hours, overtime hours, status badge, and actions."),
        topTip("The weekly grouping makes it easy to review and approve an entire week's timesheets at once. Expand the current week to focus on what needs attention now."),

        h2("8.5 Creating a New Timesheet"),
        step(1, "Click 'New Timesheet' in the top right."),
        step(2, "Select the Contractor, Assignment, and Week Starting date."),
        step(3, "Enter the Total Hours, Overtime Hours, and any notes."),
        step(4, "Click 'Save'. The timesheet is created in Draft status."),

        h2("8.6 Viewing and Editing Timesheets"),
        body("Click a timesheet row to view details. From the detail page, click 'Edit' to modify hours, notes, or status. You can approve, reject, or submit timesheets from the detail page."),

        h2("8.7 Timesheet Approval"),
        body("When a timesheet is submitted, it enters the approval workflow:"),
        step(1, "The timesheet moves to 'Submitted' status."),
        step(2, "If an Approval Chain is configured for the company, the timesheet follows the multi-step chain."),
        step(3, "Standard timesheets (40 hours or less, no overtime, no exceptions) are auto-approved."),
        step(4, "Exception timesheets (overtime, bank holidays, excessive hours, zero hours) are flagged for manual review."),
        step(5, "Approvers can Approve or Reject the timesheet from the detail page."),

        h2("8.8 Approval Chains"),
        body("Navigate to Timesheets then click 'Approval Chains' to configure multi-step approval workflows."),
        step(1, "Click 'New Chain'."),
        step(2, "Name the chain and optionally assign it to a specific company (or leave blank for default)."),
        step(3, "Add approval steps in order (e.g. Step 1: Line Manager, Step 2: Finance)."),
        step(4, "Each step specifies a label and an approver role."),
        body("Without a chain configured, timesheets use simple single-step approval. Standard timesheets are auto-approved."),
        commonQuestion("What counts as an 'exception' timesheet?", "Bank holiday hours, overtime, hours over 60 per week, and zero-hour submissions are all flagged as exceptions requiring manual review."),

        // ══════════════════════════════════════════════════════════
        //  9. BILLING & INVOICES
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("9. Billing & Invoices"),

        h2("9.1 Overview"),
        body("The Billing page manages invoices from creation to payment. Invoices are auto-generated from approved timesheets and support Sage accounting export and three-way matching."),

        h2("9.2 Summary Cards"),
        body("Three summary cards at the top show Outstanding, Paid (Total), and Draft amounts in GBP. Overdue invoices are highlighted with a red tint in the table."),

        h2("9.3 Status Filter Pills"),
        body("Filter invoices by: All, Draft, Reconciling, Approved, Sent, Paid, Disputed."),

        h2("9.4 Invoice Table"),
        body("The table shows: Invoice number, Company, Period, Lines count, Total amount, Status with Overdue tag, Match status (Matched/Partial/Unmatched), Due date, and Actions. Click 'View' to see full invoice details."),

        h2("9.5 Generating Invoices"),
        step(1, "Click 'Generate Invoices' from the Billing page."),
        step(2, "Select the billing Period Start and Period End dates."),
        step(3, "Optionally select a specific Company, or leave as 'All Companies' to generate separate invoices per company."),
        step(4, "Set the VAT Rate (defaults to 20%)."),
        step(5, "Click 'Generate Invoices'. The system finds all approved timesheets in the period, groups them by company, calculates amounts using contractor charge rates, and creates invoices with VAT."),
        body("The info panel on the right shows 'Ready to Invoice' count of approved timesheets."),
        watchOut("Only approved timesheets are included. If the count shows 0, make sure timesheets are approved before generating invoices."),

        h2("9.6 Invoice Detail & Actions"),
        body("The invoice detail page shows:"),
        body("  - Header: Supplier (PRL), Client, Period, Due Date, PO Reference."),
        body("  - Line items table: Description, Hours, OT Hours, Rate, Amount."),
        body("  - Subtotal, VAT, and Total."),
        body("  - Three-Way Matching panel (see below)."),
        body("  - Action buttons depending on status:"),
        body("    Draft: Approve Invoice, Delete Draft."),
        body("    Approved: Mark as Sent, Mark as Paid."),
        body("    Sent: Mark as Paid."),
        body("  - Export for Sage button (available on all invoices)."),

        h2("9.7 Three-Way Matching"),
        body("Each invoice displays a Three-Way Matching panel that verifies three elements:"),
        body("  1. Purchase Order (PO): Whether a PO number is linked to the invoice."),
        body("  2. Timesheets: Whether the invoice lines are linked to approved timesheets."),
        body("  3. Invoice: The invoice itself (always matched)."),
        body("A badge shows 'X/3 checks complete'. A fully matched invoice (3/3) shows green, partial match shows amber, and low match shows red."),
        topTip("Always add a PO number when creating or editing invoices to achieve a full three-way match. This is best practice for audit compliance."),

        h2("9.8 Sage Export"),
        body("To export an invoice for import into Sage accounting software:"),
        step(1, "Open the invoice detail page."),
        step(2, "Click 'Export for Sage'."),
        step(3, "A CSV file downloads in Sage 50/200 compatible format with columns: Type, Account Ref, Nominal A/C Ref, Department, Date, Reference, Details, Net Amount, Tax Code, Tax Amount, Exchange Rate, Extra Reference, Project Ref."),
        step(4, "Import the CSV file into Sage using the standard Sage import function."),
        commonQuestion("What format is the Sage export?", "It produces a standard Sales Invoice (SI) CSV with T1 tax code for UK VAT. Each invoice line becomes a separate row. The account reference is derived from the company name."),

        h2("9.9 Spend Dashboard"),
        body("Click 'Spend Dashboard' from the Billing page to access real-time spend analysis."),
        body("The Spend Dashboard includes:"),
        body("  - KPI Cards: Total Spend, Paid, Outstanding, and Overdue amounts."),
        body("  - Variance Alerts: Automatic alerts for overdue invoices, high overtime percentages, and invoice amount variances above average."),
        body("  - Monthly Spend Trend: A visual bar chart showing spend for the last 6 months."),
        body("  - Spend by Company: Ranked list of companies by total spend with percentage breakdown."),
        body("  - Top Contractors by Spend: Table showing highest-spend contractors with hours, total, average rate, and percentage of total spend."),
        watchOut("If overtime exceeds 15% of total hours, the Spend Dashboard displays a warning. Review staffing levels to manage costs."),

        // ══════════════════════════════════════════════════════════
        //  10. COMPLIANCE
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("10. Compliance Dashboard"),

        h2("10.1 Overview"),
        body("The Compliance Dashboard provides a complete view of workforce compliance across all contractors. It features a risk score ring, per-type progress bars, compliance gap detection, search/filter, and a detailed records table."),

        h2("10.2 Compliance Score Ring"),
        body("A circular score ring in the top-right shows the overall compliance percentage (verified records divided by total records). This same ring also appears on the main Dashboard."),

        h2("10.3 Summary Cards"),
        body("Three colour-coded summary cards show: Compliant (green), Expiring (amber), and Non-Compliant (red) counts."),

        h2("10.4 Per-Type Progress Bars"),
        body("For each compliance type in the system (Right to Work, DBS, CSCS, Insurance, IR35 Assessment, Qualification, Other), a progress bar shows how many records are verified out of the total. Each bar includes:"),
        body("  - A status icon (check, warning triangle, or clock)."),
        body("  - The type name."),
        body("  - A fraction showing verified/total."),
        body("  - A coloured progress bar (green for verified, amber for expiring, red for non-compliant)."),
        body("  - A status badge."),

        h2("10.5 Compliance Gaps"),
        body("If any active contractors are missing mandatory compliance requirements, a red Compliance Gaps panel appears showing:"),
        body("  - The contractor name (clickable link to their profile)."),
        body("  - Their assignment role and company."),
        body("  - The missing or expired requirement type."),
        body("  - Status badge (Missing, Expired, Expiring)."),
        watchOut("Compliance Gaps mean contractors are working on site without required documents. Address these immediately -- they represent a legal and safety risk."),

        h2("10.6 Compliance Requirements Checklists"),
        body("Click 'Checklists' from the Compliance page header to manage compliance requirement templates. You can create checklists that define which document types are mandatory for specific assignment roles or companies."),
        step(1, "Click 'Checklists' on the Compliance page."),
        step(2, "Click 'New Requirement' to create a new checklist."),
        step(3, "Define the required compliance types, which roles they apply to, and whether they are mandatory."),

        h2("10.7 Search, Status Filter, and Type Filter"),
        step(1, "Use the search box to find compliance records by contractor name."),
        step(2, "Use the Status dropdown to filter: Verified, Pending, Expiring, Expired, Non-Compliant."),
        step(3, "Use the Type dropdown to filter by document type (populated from actual types in the database)."),
        step(4, "Click 'Filter' to apply. Click 'Clear filters' to reset."),

        h2("10.8 Compliance Records Table"),
        body("The table shows: Contractor (with avatar), Type, Document/Reference, Issue Date, Expiry Date, Status (with colour-coded left border for urgency), and Actions. Click 'View' to see full record details."),

        h2("10.9 Viewing a Compliance Record"),
        body("The compliance record detail page shows all fields (contractor, type, document name, reference, issue/expiry dates, status, notes). Key features:"),
        body("  - Quick Verify Button: If the record is not yet verified, a 'Quick Verify' button appears next to the status badge. Click it to instantly mark the record as Verified without navigating to the edit form."),
        body("  - Staff Document Upload: A blue upload section allows staff to upload supporting documents directly on the compliance record. Upload a file by choosing a file and clicking upload. Uploaded files appear in a list with filename, version, date, uploader, file size, and a Download button."),
        body("  - Edit and Delete buttons in the header."),

        h2("10.10 Adding a New Compliance Record"),
        step(1, "Click 'Add Record' from the Compliance Dashboard."),
        step(2, "Select a Contractor, Type (Right to Work, DBS, CSCS, Insurance, IR35 Assessment, Qualification, Other)."),
        step(3, "Fill in Document Name, Reference, Issue Date, Expiry Date, Notes, and Status."),
        step(4, "Click 'Save'."),

        h2("10.11 Quick Verify"),
        body("The Quick Verify feature allows staff to mark a compliance record as Verified with a single click, without opening the edit form."),
        step(1, "Navigate to a compliance record detail page."),
        step(2, "If the status is not Verified, a green 'Quick Verify' button appears next to the status badge."),
        step(3, "Click 'Quick Verify'. The status changes to Verified immediately."),
        topTip("Quick Verify is perfect for when you have verified a document externally and just need to update the system status. It saves several clicks compared to Edit, change status, Save."),

        h2("10.12 Staff Document Upload on Compliance Records"),
        body("Staff can upload documents directly on any compliance record:"),
        step(1, "Open a compliance record."),
        step(2, "In the blue 'Upload Document' section, click Choose File and select the document."),
        step(3, "Click Upload. The document is stored and linked to the contractor and compliance type."),
        step(4, "Previously uploaded documents appear in a list below with version numbers, dates, uploaders, and Download buttons."),
        body("Documents are versioned -- uploading a new file for the same type creates a new version; previous versions are retained."),

        // ══════════════════════════════════════════════════════════
        //  11. RATES
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("11. Rate Cards"),

        h2("11.1 Overview"),
        body("The Rates page manages pay and charge rate cards. Each rate card defines the pay rate (what you pay the contractor), charge rate (what you charge the client), and the resulting margin percentage."),

        h2("11.2 Rate Cards Table"),
        body("The table shows: Role, Location, Pay/Hr, Charge/Hr, Margin % (colour-coded: green for 30%+, amber for 20-30%, red for under 20%), Effective From, Effective To, and Actions."),

        h2("11.3 Adding a New Rate Card"),
        step(1, "Click 'Add Rate Card'."),
        step(2, "Enter the Role, Location, Pay Rate per hour, Charge Rate per hour, Effective From date, and optional Effective To date."),
        step(3, "The margin is calculated automatically."),
        step(4, "Click 'Save'."),

        h2("11.4 Editing a Rate Card"),
        body("Click 'Edit' on any rate card row to update the rates or dates."),
        topTip("Use effective dates to manage rate changes. Create a new rate card with a future Effective From date to plan ahead for rate reviews."),
        commonQuestion("How is the margin calculated?", "Margin = ((Charge Rate - Pay Rate) / Charge Rate) x 100. For example, if you pay 30 GBP/h and charge 45 GBP/h, the margin is 33.3%."),

        // ══════════════════════════════════════════════════════════
        //  12. SUPPLIERS
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("12. Suppliers"),

        h2("12.1 Overview"),
        body("The Suppliers page displays all supplier agencies as visual cards in a grid layout. Suppliers provide contractors to PRL Site Solutions."),

        h2("12.2 Supplier Cards"),
        body("Each supplier card shows:"),
        body("  - Supplier Name and Tier badge (Gold, Silver, Bronze)."),
        body("  - Contractor count (number of contractors from this supplier)."),
        body("  - Performance Score bar (0-100, colour-coded: green 75+, amber 50-74, red under 50)."),
        body("  - Contact details: Name, Email, Phone."),
        body("Click any card to view the full supplier profile."),

        h2("12.3 Adding a New Supplier"),
        step(1, "Click the blue 'Add Supplier' button."),
        step(2, "Fill in: Name, Tier (Gold/Silver/Bronze), Score, Contact Name, Contact Email, Contact Phone, and Active status."),
        step(3, "Click 'Save'."),

        h2("12.4 Viewing and Editing a Supplier"),
        body("Click a supplier card to view details. From the detail page, click 'Edit' to modify the record."),
        topTip("Use the Performance Score to track supplier quality over time. Review scores quarterly and use them in contract renewal discussions."),

        // ══════════════════════════════════════════════════════════
        //  13. ACTIVITY LOG
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("13. Activity Log"),

        h2("13.1 Overview"),
        body("The Activity Log provides a complete audit trail of all actions taken in the system. Every create, update, delete, approval, rejection, login, and export is recorded automatically."),

        h2("13.2 Activity Feed"),
        body("The feed shows a chronological list of events, each with:"),
        body("  - An action icon (e.g. + for Created, pencil for Updated, tick for Approved, key for Logged In, download for Exported)."),
        body("  - The user who performed the action."),
        body("  - The action description."),
        body("  - The entity type (Contractor, Timesheet, Invoice, etc.) as a label."),
        body("  - Additional details about what changed."),
        body("  - Timestamp and user email."),

        h2("13.3 Filtering the Activity Log"),
        step(1, "Use the User dropdown to filter by a specific user's email."),
        step(2, "Use the Entity dropdown to filter by entity type (Contractor, Timesheet, Invoice, Compliance, etc.)."),
        step(3, "Click 'Filter' to apply."),
        body("The log is paginated with 50 entries per page. Use the page numbers at the bottom to navigate."),
        topTip("The Activity Log is invaluable for audit purposes. If there is ever a question about who changed what and when, the Activity Log has the answer."),
        commonQuestion("Is the Activity Log tamper-proof?", "Activity log entries are write-only records. They cannot be edited or deleted through the application interface."),

        // ══════════════════════════════════════════════════════════
        //  14. CONTRACTOR PORTAL
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("14. Contractor Portal"),

        h2("14.1 Overview"),
        body("The Contractor Portal is a separate self-service interface for contractors. It is designed with a mobile-first approach and gives contractors access to their own timesheets, documents, compliance records, and profile."),
        body("Contractors log in using the same login page as staff but are redirected to /portal instead of the staff dashboard."),

        h2("14.2 Portal Dashboard"),
        body("After logging in, contractors see a personalised dashboard with:"),
        body("  - A welcome message ('Hello, [First Name]')."),
        body("  - Four Quick Action buttons:"),
        body("    1. New Timesheet (blue): Submit hours for the current week."),
        body("    2. Upload Docs (green): Go to the Document Vault."),
        body("    3. Compliance (orange): View and upload compliance documents, showing current compliance percentage."),
        body("    4. My Profile (grey): View personal and work details."),
        body("  - Quick Stats: Three cards showing Draft Timesheets, Approved count, and Compliance Alerts."),
        body("  - Active Assignments: A list of the contractor's current assignments with role, company, location, status, and start date."),
        body("  - Recent Timesheets: The last 5 timesheets with week, hours, overtime, status badge, and clickable to view detail."),
        body("  - Compliance Alerts: If any compliance items are expiring or expired, a red alert section appears showing each item, its status, and expiry date."),

        h2("14.3 Contractor Timesheets"),
        body("The portal Timesheets page lets contractors create and view their timesheets."),
        h3("14.3.1 Submitting a New Timesheet"),
        step(1, "From the portal dashboard, click 'New Timesheet' or navigate to Portal > Timesheets."),
        step(2, "Select an Assignment from the dropdown (only active/placed assignments are shown)."),
        step(3, "Select the Week Starting date (must be a Monday)."),
        step(4, "Click 'Create Timesheet'."),
        step(5, "The timesheet is created and can be edited to add hours before submission."),

        h3("14.3.2 Viewing Timesheets"),
        body("All timesheets appear in a list showing date, assignment (role and company), hours, overtime, and status badge. Tap any timesheet to view its full details."),

        h2("14.4 Document Vault"),
        body("The Document Vault is a secure file storage area for the contractor's personal documents."),
        h3("14.4.1 Storage Summary"),
        body("At the top, three summary cards show: Total Files, Document Types uploaded, and Storage Used (in KB or MB)."),

        h3("14.4.2 Uploading Documents"),
        step(1, "Navigate to Portal > Documents."),
        step(2, "In the upload section, select the Document Type (CSCS Card, CV/Resume, P45, P60, Passport/ID, DBS Check, Insurance, Qualification/Cert, Right to Work, IR35 Assessment, Other)."),
        step(3, "Choose the file from your device."),
        step(4, "Click 'Upload'. The file is securely stored."),

        h3("14.4.3 Document Vault Display"),
        body("The vault shows every document type as a row with:"),
        body("  - Type icon and label."),
        body("  - If uploaded: filename, version number, upload date, file size, and a Download button."),
        body("  - If not uploaded: 'Not uploaded' label with a 'Missing' indicator."),
        body("If multiple versions exist for a type, a collapsible 'Previous versions' section appears showing older versions with individual download buttons."),
        body("Documents are securely stored and only accessible by the contractor and PRL staff."),
        topTip("When you upload a new version of a document (e.g. updated CSCS card), the old version is kept. PRL staff can see all versions."),

        h2("14.5 Contractor Compliance Self-Service"),
        body("The portal Compliance page shows the contractor their compliance status and lets them upload documents for each required type."),

        h3("14.5.1 Compliance Score"),
        body("A large compliance score percentage is shown at the top, colour-coded (green 80%+, amber 50-80%, red under 50%). Below it, a progress bar shows how many of the required types have been submitted."),

        h3("14.5.2 Required Documents"),
        body("Each required compliance type (CSCS, Right to Work, DBS, Insurance, Qualification, IR35 Assessment) is shown as a card with:"),
        body("  - Icon, label, and description."),
        body("  - Status badge (Verified, Pending, Expiring, Expired, Non-Compliant, or Required)."),
        body("  - If a record exists: reference number, issue date, expiry date, and linked file details."),
        body("  - If Verified: A green footer saying 'Verified by PRL Site Solutions'."),
        body("  - If Pending: A blue footer saying 'Submitted -- awaiting verification by PRL staff'."),
        body("  - If not submitted, expired, or expiring: An upload section appears allowing the contractor to upload the document."),

        h3("14.5.3 Uploading Compliance Documents"),
        step(1, "Find the required compliance type that needs attention (marked 'Required', 'Expired', or 'Expiring')."),
        step(2, "In the upload section, enter a reference number and expiry date."),
        step(3, "Choose the file from your device."),
        step(4, "Click 'Upload'. The system creates or updates the compliance record and stores the document."),
        step(5, "The status changes to 'Pending'. PRL staff will then verify the document and mark it as Verified."),
        commonQuestion("How do I know when my document has been verified?", "When PRL staff verify your document, the status changes from 'Pending' to 'Verified' and a green 'Verified by PRL Site Solutions' footer appears on that compliance item."),

        h2("14.6 Contractor Profile"),
        body("The Profile page shows the contractor's personal and work information."),
        body("  - Profile Header: Initials avatar, full name, job title, and status badge."),
        body("  - Contact Details: Email, phone, and notes."),
        body("  - Work Details: Role/Trade, UTR Number, IR35 Status, NI Number."),
        body("  - Assignment History: Complete list of all assignments (current and past) with role, company, location, status, and dates."),
        body("  - Compliance Summary: List of all compliance records with type, expiry date, and status badge."),
        body("A note at the bottom tells contractors to contact PRL Site Solutions to update their personal details."),

        // ══════════════════════════════════════════════════════════
        //  15. MOBILE USAGE
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("15. Mobile Usage"),

        h2("15.1 Responsive Design"),
        body("The entire system is fully responsive and works on all screen sizes. Tables scroll horizontally on small screens, and cards stack vertically. The Kanban board columns stack on narrow screens."),

        h2("15.2 Mobile Top Bar"),
        body("On mobile, a fixed top bar appears with the PRL logo, company name, hamburger menu, and logout button. The hamburger menu shows a red dot notification when there are pending timesheets."),

        h2("15.3 Mobile Sidebar Drawer"),
        body("Tapping the hamburger menu opens a slide-out drawer from the left with all navigation items plus badge counts. Tapping outside the drawer or pressing the X button closes it."),

        h2("15.4 PWA Installation"),
        step(1, "Open the system URL in Chrome (Android) or Safari (iPhone)."),
        step(2, "On Android: Tap the three-dot menu and select 'Add to Home screen'. On iPhone: Tap the share icon and select 'Add to Home Screen'."),
        step(3, "The app icon appears on your home screen. Tap it to launch the system in full-screen mode."),
        topTip("Installing the PWA gives you push notification support, faster loading, and an app-like full-screen experience."),

        h2("15.5 Touch Interactions"),
        body("All interactive elements are touch-optimised:"),
        body("  - Buttons have large touch targets."),
        body("  - Kanban board drag-and-drop works with long-press (200ms) to start dragging."),
        body("  - Forms use mobile-appropriate input types (e.g. date pickers, number keyboards)."),
        body("  - The contractor portal is specifically designed mobile-first."),

        // ══════════════════════════════════════════════════════════
        //  16. QUICK REFERENCE
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("16. Quick Reference"),

        h2("16.1 Keyboard Shortcuts"),
        body("While there are no custom keyboard shortcuts, standard browser shortcuts work:"),
        body("  - Ctrl+F (Cmd+F on Mac): Browser find on page."),
        body("  - Tab/Shift+Tab: Navigate between form fields."),
        body("  - Enter: Submit forms."),

        h2("16.2 Status Reference"),
        h3("Contractor Statuses"),
        body("  Active: Currently available for assignments."),
        body("  Inactive: Not currently working."),
        body("  On Hold: Temporarily paused."),

        h3("Assignment Statuses"),
        body("  Placed: Contract signed, not yet started."),
        body("  Active: Currently working on site."),
        body("  Ending: Assignment ending soon."),
        body("  Completed: Assignment finished."),

        h3("Timesheet Statuses"),
        body("  Draft: Being prepared, not yet submitted."),
        body("  Submitted: Sent for approval."),
        body("  Approved: Approved and ready for billing."),
        body("  Rejected: Sent back for correction."),

        h3("Invoice Statuses"),
        body("  Draft: Generated but not yet reviewed."),
        body("  Reconciling: Being checked against records."),
        body("  Approved: Reviewed and approved for sending."),
        body("  Sent: Sent to the client."),
        body("  Paid: Payment received."),
        body("  Disputed: Client has raised a query."),

        h3("Compliance Statuses"),
        body("  Verified: Document checked and confirmed valid."),
        body("  Pending: Submitted and awaiting staff verification."),
        body("  Expiring: Document will expire within 30 days."),
        body("  Expired: Document has passed its expiry date."),
        body("  Non-Compliant: Document is missing or invalid."),

        h2("16.3 Compliance Document Types"),
        body("  Right to Work: Passport, visa, or share code proving UK work eligibility."),
        body("  DBS: Disclosure and Barring Service certificate."),
        body("  CSCS: Construction Skills Certification Scheme card."),
        body("  Insurance: Public liability or professional indemnity insurance."),
        body("  IR35 Assessment: Status Determination Statement for off-payroll working."),
        body("  Qualification: Trade qualifications, NVQs, or professional certificates."),
        body("  Other: Any additional documents."),

        h2("16.4 Supplier Tiers"),
        body("  Gold: Highest tier supplier with proven track record."),
        body("  Silver: Reliable supplier meeting most performance criteria."),
        body("  Bronze: New or developing supplier relationship."),

        // ══════════════════════════════════════════════════════════
        //  17. TROUBLESHOOTING
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        h1("17. Troubleshooting"),

        h2("17.1 Cannot Log In"),
        body("  - Check your email address is correct (case does not matter for email, but password is case-sensitive)."),
        body("  - Use the 'Forgot Password' flow to reset your password."),
        body("  - If you are a new staff member, ask an admin to run the setup-staff endpoint to create your account."),
        body("  - If you are a contractor, ask PRL staff to ensure your contractor record exists and the contractor-login has been created."),

        h2("17.2 Badge Counts Not Updating"),
        body("  - Badge counts refresh automatically every 30 seconds."),
        body("  - If counts seem stale, refresh the page with F5 or pull-to-refresh on mobile."),

        h2("17.3 Kanban Drag Not Working on Mobile"),
        body("  - Long-press (hold) on the card for about 200 milliseconds before dragging."),
        body("  - Ensure you are pressing on the card body, not on the 'View' link."),
        body("  - If using Safari on iPhone, make sure you are not accidentally triggering the browser's long-press context menu."),

        h2("17.4 Invoice Generation Shows 'No Timesheets'"),
        body("  - Ensure there are approved timesheets within the selected date range."),
        body("  - Check the company filter -- timesheets must be linked to assignments for the selected company."),
        body("  - Timesheets must be in 'Approved' status; Draft or Submitted timesheets are not included."),

        h2("17.5 Compliance Document Upload Fails"),
        body("  - Check the file size (maximum varies by hosting configuration)."),
        body("  - Ensure the file is a valid document format (PDF, JPG, PNG, or DOCX)."),
        body("  - Try uploading on a stable internet connection."),

        h2("17.6 Password Reset Email Not Arriving"),
        body("  - Check your spam/junk folder."),
        body("  - Ensure your email address matches exactly what is in the system."),
        body("  - The email may take a few minutes to arrive depending on email server processing."),
        body("  - If the email consistently fails, contact your system administrator to check the email configuration."),

        // ══════════════════════════════════════════════════════════
        //  END
        // ══════════════════════════════════════════════════════════
        pageBreak(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2000 },
          children: [new TextRun({ text: "End of Guide", bold: true, size: 28, font: "Calibri", color: GREY })],
        }),
        spacer(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "PRL Site Solutions - Contractor Management System", size: 22, font: "Calibri", color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60 },
          children: [new TextRun({ text: "For support, contact your system administrator.", size: 20, font: "Calibri", color: GREY })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Document generated: " + new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), size: 18, font: "Calibri", color: GREY })],
        }),
      ],
    },
  ],
});

// ─── Generate the .docx file ───────────────────────────────────────
Packer.toBuffer(doc).then((buffer) => {
  const outPath = __dirname + "/PRL_Complete_User_Guide.docx";
  fs.writeFileSync(outPath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`Guide generated successfully: ${outPath}`);
  console.log(`File size: ${sizeKB} KB`);
});
