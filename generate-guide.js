const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  TabStopPosition,
  TabStopType,
  TableOfContents,
  PageBreak,
  BorderStyle,
  convertInchesToTwip,
  LevelFormat,
} = require("docx");
const fs = require("fs");

// ── Helpers ──────────────────────────────────────────────────────────────────

const FONT = "Arial";
const BLUE = "1D4ED8";
const DARK = "111827";
const GRAY = "6B7280";
const GREEN = "059669";
const RED = "DC2626";
const AMBER = "D97706";

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({ text, font: FONT, size: 32, bold: true, color: BLUE }),
    ],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({ text, font: FONT, size: 26, bold: true, color: DARK }),
    ],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text, font: FONT, size: 22, bold: true, color: DARK }),
    ],
  });
}

function para(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, font: FONT, size: 21, color: DARK })],
  });
}

function boldPara(label, text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: label, font: FONT, size: 21, bold: true, color: DARK }),
      new TextRun({ text, font: FONT, size: 21, color: DARK }),
    ],
  });
}

function tipPara(text) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: "TOP TIP: ", font: FONT, size: 21, bold: true, color: GREEN }),
      new TextRun({ text, font: FONT, size: 21, color: GREEN }),
    ],
  });
}

function warningPara(text) {
  return new Paragraph({
    spacing: { before: 80, after: 120 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: "WATCH OUT: ", font: FONT, size: 21, bold: true, color: RED }),
      new TextRun({ text, font: FONT, size: 21, color: RED }),
    ],
  });
}

function numberedStep(num, text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.3) },
    children: [
      new TextRun({ text: `${num}. `, font: FONT, size: 21, bold: true, color: BLUE }),
      new TextRun({ text, font: FONT, size: 21, color: DARK }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullet-list", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: FONT, size: 21, color: DARK })],
  });
}

function questionAnswer(q, a) {
  return [
    new Paragraph({
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({ text: "Q: ", font: FONT, size: 21, bold: true, color: BLUE }),
        new TextRun({ text: q, font: FONT, size: 21, bold: true, color: DARK }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: convertInchesToTwip(0.3) },
      children: [
        new TextRun({ text: "A: ", font: FONT, size: 21, bold: true, color: GRAY }),
        new TextRun({ text: a, font: FONT, size: 21, color: DARK }),
      ],
    }),
  ];
}

function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function navInstruction(menuItem) {
  return para(`How to get there: Click "${menuItem}" in the menu on the left side of the screen.`);
}

// ── Build Document ───────────────────────────────────────────────────────────

const sections = [];

// ── COVER PAGE ───────────────────────────────────────────────────────────────

sections.push(
  spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new TextRun({ text: "PRL Site Solutions", font: FONT, size: 52, bold: true, color: BLUE }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "Contractor Management System", font: FONT, size: 32, color: DARK }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [
      new TextRun({ text: "Complete User Guide", font: FONT, size: 28, bold: true, color: DARK }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "Recruitment Specialists", font: FONT, size: 22, color: GRAY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "Version 1.0 - March 2026", font: FONT, size: 20, color: GRAY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "Written for beginners - no technical knowledge required", font: FONT, size: 20, italics: true, color: GRAY }),
    ],
  }),
  pageBreak()
);

// ── TABLE OF CONTENTS ────────────────────────────────────────────────────────

sections.push(
  heading1("Table of Contents"),
  spacer(),
  para("1.  Getting Started"),
  para("2.  Forgot Password"),
  para("3.  Dashboard"),
  para("4.  Intelligence"),
  para("5.  Contractors"),
  para("6.  Companies"),
  para("7.  Assignments (Kanban Board)"),
  para("8.  Timesheets"),
  para("9.  Billing & Invoices"),
  para("10. Compliance"),
  para("11. Rates"),
  para("12. Suppliers"),
  para("13. Activity Log"),
  para("14. Contractor Portal"),
  para("15. Mobile / Add to Home Screen"),
  para("16. Troubleshooting & FAQ"),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 1. GETTING STARTED
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("1. Getting Started"),
  heading2("What is it?"),
  para("The PRL Site Solutions app is an online system that helps PRL manage their contractors, timesheets, invoices, and compliance documents. You access it through a web browser on your computer, tablet, or phone."),
  heading2("How to Log In"),
  numberedStep(1, "Open your web browser (Chrome, Edge, Safari, or Firefox all work)."),
  numberedStep(2, "Type the PRL Site Solutions web address into the address bar and press Enter."),
  numberedStep(3, "You will see the login page with the PRL logo and two boxes: Email and Password."),
  numberedStep(4, "Type your email address into the Email box (e.g. you@prlsitesolutions.co.uk)."),
  numberedStep(5, "Type your password into the Password box."),
  numberedStep(6, "Click the blue 'Sign in' button."),
  numberedStep(7, "If your details are correct, you will be taken to the Dashboard (the home page)."),
  numberedStep(8, "If you see a red error message saying 'Invalid email or password', check your email and password and try again."),
  tipPara("Your browser can remember your password for you. When it asks if you want to save your password, click Yes. This makes logging in faster next time."),
  warningPara("Never share your password with anyone else. Each person should have their own login."),
  heading2("What You See After Logging In"),
  para("After you log in, you will see:"),
  bullet("The Dashboard in the main area showing key numbers like total contractors, active assignments, pending timesheets, and compliance alerts."),
  bullet("A menu on the left side of the screen (on a computer) with links to all the different sections of the app."),
  bullet("On a phone, the menu is hidden. Tap the three-line icon (hamburger menu) at the top left to open it."),
  heading2("The Navigation Menu"),
  para("The left-hand menu has the following items. Click any one to go to that section:"),
  bullet("Dashboard - Your home page with key numbers at a glance."),
  bullet("Intelligence - AI-powered workforce insights and warnings."),
  bullet("Contractors - View and manage all your contractors."),
  bullet("Companies - View and manage client companies."),
  bullet("Assignments - See which contractors are assigned where (Kanban board)."),
  bullet("Timesheets - Create, view, and approve timesheets."),
  bullet("Billing - Invoices, Sage export, and spend dashboard."),
  bullet("Compliance - Track documents, expiry dates, and risk scores."),
  bullet("Rates - View and manage pay and charge rates."),
  bullet("Suppliers - Manage your supplier agencies."),
  bullet("Activity Log - See a record of everything everyone has done in the system."),
  heading2("How to Sign Out"),
  numberedStep(1, "Click 'Sign out' at the bottom of the left-hand menu."),
  numberedStep(2, "On a phone, you can also tap the logout icon in the top-right corner of the screen."),
  numberedStep(3, "You will be taken back to the login page."),
  tipPara("Always sign out when you are finished, especially if you are using a shared computer."),
  ...questionAnswer("I cannot see the menu on my phone.", "Tap the three-line icon (hamburger menu) at the top-left corner of the screen. The menu will slide out from the left."),
  ...questionAnswer("My screen looks different to someone else's.", "The app adjusts its layout depending on your screen size. On a phone things stack vertically. On a computer they sit side by side. The features are the same."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 2. FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("2. Forgot Password"),
  heading2("What is it?"),
  para("If you have forgotten your password, you can request a password reset link to be sent to your email address. This lets you create a new password without needing to contact anyone."),
  heading2("How to get there"),
  para("Go to the login page. Below the Sign in button you will see a blue link that says 'Forgot your password?'. Click it."),
  heading2("Step-by-Step: Reset Your Password"),
  numberedStep(1, "Go to the login page."),
  numberedStep(2, "Click 'Forgot your password?' below the Sign in button."),
  numberedStep(3, "A small section will appear asking you to enter your email address."),
  numberedStep(4, "Type your email address into the box."),
  numberedStep(5, "Click the blue 'Send' button."),
  numberedStep(6, "If your email exists in the system, you will see a green message: 'If that email exists, a reset link has been sent. Check your inbox.'"),
  numberedStep(7, "Open your email inbox and look for the password reset email from PRL Site Solutions."),
  numberedStep(8, "Click the link in the email to set a new password."),
  numberedStep(9, "Choose a strong new password and confirm it."),
  numberedStep(10, "Go back to the login page and sign in with your new password."),
  tipPara("Check your spam or junk folder if you do not see the email within a few minutes."),
  warningPara("If you see an error message saying 'No account found with that email', it means your email has not been added to the system yet. Ask your manager to add you."),
  para("To go back to the normal login screen without sending a reset email, click 'Back to login'."),
  ...questionAnswer("I never received the reset email.", "Check your spam/junk folder. If it is not there, ask your administrator to check that your email address is correctly entered in the system."),
  ...questionAnswer("Can I change my password without forgetting it?", "Currently, you use the forgot password flow to change your password. Contact your administrator if you need further help."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("3. Dashboard"),
  heading2("What is it?"),
  para("The Dashboard is the first page you see when you log in. It gives you a quick overview of your entire workforce with key numbers and alerts so you can see the health of your business at a glance."),
  navInstruction("Dashboard"),
  heading2("What Each Card Means"),
  heading3("The Six Summary Cards"),
  para("At the top of the Dashboard, you will see six cards with numbers:"),
  bullet("Total Contractors - The total number of contractors in your system (active, inactive, and on hold)."),
  bullet("Active Assignments - How many assignments are currently in 'Active' status (contractors who are working right now)."),
  bullet("Pending Timesheets - The number of timesheets waiting to be approved. These are in Draft or Submitted status."),
  bullet("Compliance Alerts - How many compliance records are in Expiring, Expired, or Non-Compliant status. If this number is high, action is needed."),
  bullet("Companies - The total number of client companies in the system."),
  bullet("Active Suppliers - The number of supplier agencies that are currently active."),
  tipPara("If the Compliance Alerts number is greater than zero, click on it or go to the Compliance section to see which documents need attention."),
  heading3("Recent Contractors"),
  para("Below the cards on the left side, you will see a list of the five most recently added contractors. Each entry shows their name, job title, status (Active, Inactive, or On Hold), and the date they were added."),
  heading3("Compliance Alerts"),
  para("On the right side, you will see a list of up to five compliance records that need attention. Each shows the contractor's name, the type of document (e.g. DBS, CSCS, Right to Work), its expiry date, and its status. A compliance score ring shows your overall compliance percentage."),
  warningPara("A low compliance score means many of your contractors have missing or expired documents. This is a business risk and should be addressed urgently."),
  ...questionAnswer("What does the compliance score ring mean?", "It shows the percentage of compliance records that are in Verified status. 100% means all documents are verified and up to date. Anything below 100% means some documents need attention."),
  ...questionAnswer("Can I click on the numbers?", "The cards show summary numbers. To see the detail, use the menu on the left to go to the relevant section (e.g. click Contractors to see all contractors)."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. INTELLIGENCE
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("4. Intelligence"),
  heading2("What is it?"),
  para("The Intelligence page uses smart analysis to scan your entire workforce data and automatically detect problems, risks, and opportunities. Think of it as a digital assistant that watches over your data and tells you when something needs your attention."),
  navInstruction("Intelligence"),
  heading2("System Health"),
  para("At the top you will see four category boxes showing the health of your system across four areas:"),
  bullet("Compliance - Are contractor documents up to date?"),
  bullet("Financial - Are there any billing or cost concerns?"),
  bullet("Workforce - Are there staffing issues or gaps?"),
  bullet("Operational - Are day-to-day processes running smoothly?"),
  para("Each box will be coloured green (healthy), amber (needs attention), or red (action needed)."),
  heading2("Actionable Insights"),
  para("Below the health boxes, you will see a list of insights. Each insight is a card that tells you:"),
  bullet("What the issue is (the title)."),
  bullet("Why it matters (the description)."),
  bullet("A number showing the scale of the issue (e.g. how many contractors are affected)."),
  bullet("A trend arrow showing if the issue is getting better or worse."),
  bullet("A button to take you directly to the relevant page to fix it."),
  para("Insights are colour-coded by how serious they are:"),
  bullet("Red (Critical) - Needs immediate attention. Something is wrong right now."),
  bullet("Amber (Warning) - Something could become a problem soon. Take action to prevent it."),
  bullet("Blue (Info) - Useful information. No immediate action needed."),
  bullet("Green (Success) - Good news. Something is going well."),
  heading2("Smart Matching"),
  numberedStep(1, "Click the 'Smart Matching' button at the top of the Intelligence page."),
  numberedStep(2, "The system will show you contractors who could be a good fit for open assignments based on their skills, location, and availability."),
  heading2("Risk Engine"),
  numberedStep(1, "Click the 'Risk Engine' button at the top of the Intelligence page."),
  numberedStep(2, "You will see a breakdown of risks across your workforce, ranked by severity."),
  heading2("Anomaly Detection"),
  numberedStep(1, "Click the 'Anomalies' button at the top of the Intelligence page."),
  numberedStep(2, "The system will show you anything unusual it has detected, such as unusually high timesheet hours or unexpected patterns."),
  tipPara("Check the Intelligence page at least once a day. It will tell you about problems before they become emergencies."),
  warningPara("If you see any red Critical items, deal with them straight away. They usually mean something is expired or non-compliant."),
  ...questionAnswer("Where does the intelligence data come from?", "It comes from the data already in the system: contractors, assignments, timesheets, compliance records, and billing. No extra data entry is needed."),
  ...questionAnswer("How often is the data updated?", "The insights are recalculated every time you load the page. They always show the latest information."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONTRACTORS
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("5. Contractors"),
  heading2("What is it?"),
  para("The Contractors page is where you manage all of your contractor records. You can see everyone in one place, search for specific people, add new contractors, and view or edit their details."),
  navInstruction("Contractors"),
  heading2("Viewing All Contractors"),
  para("When you open the Contractors page, you will see a table listing all contractors. Each row shows:"),
  bullet("Name - The contractor's first and last name with their initials in a blue circle."),
  bullet("Email - Their email address."),
  bullet("Job Title - What they do (e.g. Electrician, Plumber, Site Manager)."),
  bullet("Day Rate - How much they are paid per day (in pounds)."),
  bullet("Status - Active, Inactive, or On Hold."),
  bullet("Supplier - Which agency supplied them (if any)."),
  bullet("Actions - A 'View' link to see their full details."),
  heading2("Searching and Filtering"),
  numberedStep(1, "Type a name or email into the search box at the top."),
  numberedStep(2, "Use the dropdown next to the search box to filter by status (All Statuses, Active, Inactive, or On Hold)."),
  numberedStep(3, "Click the 'Filter' button to apply your search."),
  numberedStep(4, "To clear filters, delete the text from the search box, set the dropdown to 'All Statuses', and click Filter again."),
  tipPara("You can search by first name, last name, or email address. The search is not case-sensitive, so 'john' and 'John' will both work."),
  heading2("Adding a New Contractor"),
  numberedStep(1, "Click the blue 'Add Contractor' button at the top right of the page."),
  numberedStep(2, "Fill in the contractor's details: first name, last name, email, phone, job title, day rate, and status."),
  numberedStep(3, "Select a supplier from the dropdown if applicable."),
  numberedStep(4, "Click 'Save' to create the contractor record."),
  numberedStep(5, "You will be taken back to the contractors list where you can see the new entry."),
  warningPara("Make sure the email address is correct. The contractor will use this email to log into the Contractor Portal."),
  heading2("Viewing and Editing a Contractor"),
  numberedStep(1, "Find the contractor in the list (use search if needed)."),
  numberedStep(2, "Click 'View' on their row."),
  numberedStep(3, "You will see their full details, assignments, timesheets, and compliance records."),
  numberedStep(4, "Click 'Edit' to change any of their details."),
  numberedStep(5, "Make your changes and click 'Save'."),
  ...questionAnswer("Can I delete a contractor?", "It is better to set their status to Inactive rather than deleting them. This keeps a record of their history for audit purposes."),
  ...questionAnswer("What happens when I add a contractor?", "A login account is automatically created for them so they can access the Contractor Portal using their email address."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 6. COMPANIES
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("6. Companies"),
  heading2("What is it?"),
  para("The Companies page is where you manage the client companies that your contractors work for. You need to add a company before you can create assignments for it."),
  navInstruction("Companies"),
  heading2("Viewing Companies"),
  para("The companies table shows:"),
  bullet("Name - The company name."),
  bullet("City - Where they are located."),
  bullet("Contact Name - Your main contact person at that company."),
  bullet("Contact Email - Their email address."),
  bullet("Phone - Their phone number."),
  bullet("Active - Whether the company is currently active or inactive."),
  heading2("Searching for a Company"),
  numberedStep(1, "Type the company name (or part of it) into the search box."),
  numberedStep(2, "Click 'Search'."),
  numberedStep(3, "The table will update to show only matching companies."),
  numberedStep(4, "To see all companies again, clear the search box and click Search."),
  heading2("Adding a New Company"),
  numberedStep(1, "Click the blue 'Add Company' button at the top right."),
  numberedStep(2, "Fill in the company name, address, city, contact name, contact email, and phone number."),
  numberedStep(3, "Click 'Save'."),
  heading2("Viewing and Editing a Company"),
  numberedStep(1, "Click 'View' next to the company name in the table."),
  numberedStep(2, "You will see all the company details and any assignments linked to that company."),
  numberedStep(3, "Click 'Edit' to make changes, then click 'Save'."),
  tipPara("Always add the company first before creating assignments. Assignments must be linked to a company."),
  ...questionAnswer("Can I make a company inactive?", "Yes. Edit the company and change its status to Inactive. This hides it from active lists but keeps the history."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 7. ASSIGNMENTS (KANBAN)
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("7. Assignments (Kanban Board)"),
  heading2("What is it?"),
  para("The Assignments page shows you which contractors are assigned to which companies and in what role. It uses a Kanban board (a visual board with columns) to make it easy to see the status of every assignment at a glance."),
  navInstruction("Assignments"),
  heading2("Understanding the Kanban Board"),
  para("The board has four columns, one for each assignment status:"),
  bullet("Placed - The contractor has been assigned but has not started work yet."),
  bullet("Active - The contractor is currently working on this assignment."),
  bullet("Ending - The assignment is coming to an end soon."),
  bullet("Completed - The assignment is finished."),
  para("Each card on the board represents one assignment and shows the contractor's name, company, role, and dates."),
  heading2("Moving Assignments Between Columns"),
  numberedStep(1, "Click and hold on an assignment card."),
  numberedStep(2, "Drag it to a different column (e.g. from Placed to Active)."),
  numberedStep(3, "Release the card. The assignment status will update automatically."),
  tipPara("Drag and drop is the quickest way to update assignment statuses. You do not need to open each one individually."),
  heading2("Filtering Assignments"),
  para("Above the board, you will see filter pills (small buttons):"),
  numberedStep(1, "Click 'All' to see all assignments."),
  numberedStep(2, "Click 'Placed', 'Active', 'Ending', or 'Completed' to see only assignments in that status."),
  heading2("Creating a New Assignment"),
  numberedStep(1, "Click the blue 'New Assignment' button at the top right."),
  numberedStep(2, "Select a contractor from the dropdown list."),
  numberedStep(3, "Select a company from the dropdown list."),
  numberedStep(4, "Enter the role (e.g. Site Electrician)."),
  numberedStep(5, "Enter the location (e.g. Manchester)."),
  numberedStep(6, "Set the start date. Optionally set an end date."),
  numberedStep(7, "Choose the status (usually Placed for new assignments)."),
  numberedStep(8, "Click 'Save'."),
  heading2("Table View"),
  para("Below the Kanban board, there is also a traditional table view showing all assignments with columns for Contractor, Company, Role, Location, Start Date, End Date, Status, and Actions. Click 'View' to see the full details of any assignment."),
  warningPara("Make sure the contractor and company both exist in the system before creating an assignment. Add them first if they do not."),
  ...questionAnswer("What is the difference between the Kanban board and the table?", "They show the same data in different ways. The Kanban board is visual and lets you drag cards. The table gives you more detail in rows and columns. Use whichever you prefer."),
  ...questionAnswer("Can I change an assignment after creating it?", "Yes. Click View on the assignment, then click Edit. Make your changes and click Save."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 8. TIMESHEETS
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("8. Timesheets"),
  heading2("What is it?"),
  para("The Timesheets page is where you create, view, approve, and reject timesheets for your contractors. A timesheet records how many hours a contractor has worked in a given week."),
  navInstruction("Timesheets"),
  heading2("What You See"),
  para("The page shows summary information at the top:"),
  bullet("Total number of timesheets."),
  bullet("How many are exceptions (unusual entries that need extra attention)."),
  bullet("How many were auto-approved by the system."),
  heading2("Filtering Timesheets"),
  para("Use the filter pills at the top to filter by status:"),
  bullet("All - Show every timesheet."),
  bullet("Draft - Timesheets that have been started but not submitted."),
  bullet("Submitted - Timesheets sent in by contractors waiting for approval."),
  bullet("Approved - Timesheets that have been approved."),
  bullet("Rejected - Timesheets that were sent back for corrections."),
  heading2("The Timesheet Table"),
  para("Each row in the table shows:"),
  bullet("Contractor - The person who submitted the timesheet."),
  bullet("Week Starting - The Monday of the week the timesheet covers."),
  bullet("Hours - Total regular hours worked."),
  bullet("Overtime - Any overtime hours (shown in orange if greater than zero)."),
  bullet("Status - Draft, Submitted, Approved, or Rejected. Exception timesheets have an amber 'Exception' label. Auto-approved timesheets have a green 'Auto' label."),
  bullet("Assignment - Which company/assignment the hours are for."),
  bullet("Actions - Click 'View' to see full details."),
  heading2("Creating a New Timesheet"),
  numberedStep(1, "Click the blue 'New Timesheet' button at the top right."),
  numberedStep(2, "Select the contractor from the dropdown."),
  numberedStep(3, "Select the assignment from the dropdown."),
  numberedStep(4, "Choose the week starting date (always a Monday)."),
  numberedStep(5, "Enter the hours worked for each day of the week."),
  numberedStep(6, "Enter any overtime hours."),
  numberedStep(7, "Click 'Save as Draft' to save without submitting, or 'Submit' to send for approval."),
  heading2("Approving or Rejecting a Timesheet"),
  numberedStep(1, "Click 'View' on a timesheet in Submitted status."),
  numberedStep(2, "Review the hours, overtime, and any notes."),
  numberedStep(3, "Click 'Approve' to approve it, or 'Reject' to send it back."),
  numberedStep(4, "If rejecting, add a reason so the contractor knows what to change."),
  heading2("Overtime Rules"),
  para("The system tracks overtime hours separately. If a timesheet has overtime, it will be highlighted in orange. Overtime rates are usually different from standard rates and are used in billing calculations."),
  heading2("Approval Chains"),
  numberedStep(1, "Click the 'Approval Chains' button (with the settings icon) at the top of the Timesheets page."),
  numberedStep(2, "Here you can set up rules for who needs to approve timesheets and in what order."),
  numberedStep(3, "You can also set up auto-approval rules so that routine timesheets are approved automatically by the system."),
  tipPara("Timesheets marked 'Auto' were approved automatically because they matched the approval chain rules. You do not need to review these unless you want to."),
  warningPara("Exception timesheets (marked with an amber label) need manual review. These have something unusual about them, such as very high hours or missing information."),
  ...questionAnswer("What does 'Exception' mean on a timesheet?", "It means something about the timesheet is unusual and it needs a person to look at it rather than being auto-approved. For example, very high overtime hours."),
  ...questionAnswer("Can a contractor edit a rejected timesheet?", "Yes. When a timesheet is rejected, the contractor can correct the hours and resubmit it."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 9. BILLING
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("9. Billing & Invoices"),
  heading2("What is it?"),
  para("The Billing page manages invoices that are automatically generated from approved timesheets. It includes Sage export functionality and a spend dashboard for financial oversight."),
  navInstruction("Billing"),
  heading2("Summary Cards"),
  para("At the top of the page you will see three cards:"),
  bullet("Outstanding - The total value of invoices that have been approved or sent but not yet paid (shown in amber)."),
  bullet("Paid (Total) - The total value of all invoices that have been paid (shown in green)."),
  bullet("Draft - The total value of invoices still in draft status (shown in grey)."),
  heading2("Filtering Invoices"),
  para("Use the filter pills to filter by status:"),
  bullet("All, Draft, Reconciling, Approved, Sent, Paid, or Disputed."),
  heading2("The Invoice Table"),
  para("Each row shows:"),
  bullet("Invoice Number - A unique reference number for the invoice."),
  bullet("Company - Which client company the invoice is for."),
  bullet("Period - The date range the invoice covers."),
  bullet("Lines - How many line items are on the invoice."),
  bullet("Total - The invoice amount in pounds."),
  bullet("Status - The current status (Draft, Reconciling, Approved, Sent, Paid, Disputed)."),
  bullet("Match - The three-way matching status: Matched, Partial, or Unmatched."),
  bullet("Due - When the invoice is due to be paid. Overdue invoices are highlighted in red."),
  heading2("Generating Invoices"),
  numberedStep(1, "Click the blue 'Generate Invoices' button at the top right."),
  numberedStep(2, "The system will automatically create invoices from all approved timesheets that have not yet been invoiced."),
  numberedStep(3, "Review the generated invoices and approve them when ready."),
  heading2("Sage Export"),
  para("You can export invoices in a format compatible with Sage accounting software. Click the export option on an approved invoice to download the file."),
  heading2("Spend Dashboard"),
  numberedStep(1, "Click the 'Spend Dashboard' button at the top of the Billing page."),
  numberedStep(2, "You will see charts and graphs showing your spending patterns over time."),
  heading2("Three-Way Matching"),
  para("Three-way matching compares three things to make sure everything adds up:"),
  bullet("The assignment (what was agreed)."),
  bullet("The timesheet (what was worked)."),
  bullet("The invoice (what is being charged)."),
  para("If all three match, the status shows 'Matched' in green. If there are differences, it shows 'Partial' in amber or 'Unmatched' in grey."),
  tipPara("Always check the Match column. A 'Partial' or 'Unmatched' status could mean an error in hours or rates that needs correcting before payment."),
  warningPara("Overdue invoices are highlighted with a red background. Chase these up promptly."),
  ...questionAnswer("Where do invoices come from?", "Invoices are automatically generated from approved timesheets. You do not need to create them manually."),
  ...questionAnswer("What does Disputed mean?", "It means the client company has queried the invoice. You need to investigate and resolve the dispute."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 10. COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("10. Compliance"),
  heading2("What is it?"),
  para("The Compliance page helps you track and manage important documents and certifications for your contractors. This includes things like Right to Work checks, DBS certificates, CSCS cards, insurance, IR35 assessments, and qualifications."),
  navInstruction("Compliance"),
  heading2("Compliance Overview"),
  para("At the top of the page you will see a compliance overview panel with:"),
  bullet("A compliance score ring showing your overall percentage (higher is better)."),
  bullet("Three summary cards: Compliant (green), Expiring (amber), and Non-Compliant (red) counts."),
  bullet("Progress bars for each type of compliance document showing how many are verified versus total."),
  heading2("Understanding Statuses"),
  bullet("Verified (green) - The document has been checked and is valid and up to date."),
  bullet("Pending (grey) - The document has been uploaded but not yet verified."),
  bullet("Expiring (amber) - The document is valid but will expire soon. Take action before it expires."),
  bullet("Expired (red) - The document has passed its expiry date and is no longer valid."),
  bullet("Non-Compliant (red) - The document is missing or does not meet requirements."),
  heading2("Compliance Gaps"),
  para("If any contractors are missing mandatory documents, you will see a red 'Compliance Gaps' section. This shows:"),
  bullet("The contractor's name and which assignment they are on."),
  bullet("Which document type is missing (e.g. Right to Work, DBS)."),
  bullet("Whether the document is Missing or Expired."),
  heading2("Searching and Filtering"),
  numberedStep(1, "Use the search box to find records by contractor name."),
  numberedStep(2, "Use the Status dropdown to filter by Verified, Pending, Expiring, Expired, or Non-Compliant."),
  numberedStep(3, "Use the Type dropdown to filter by document type (Right to Work, DBS, CSCS, Insurance, IR35 Assessment, Qualification, Other)."),
  numberedStep(4, "Click 'Filter' to apply."),
  heading2("Adding a Compliance Record"),
  numberedStep(1, "Click the blue 'Add Record' button at the top right."),
  numberedStep(2, "Select the contractor."),
  numberedStep(3, "Choose the compliance type (e.g. DBS, CSCS, Right to Work)."),
  numberedStep(4, "Enter the document name and reference number."),
  numberedStep(5, "Enter the issue date and expiry date."),
  numberedStep(6, "Upload a copy of the document if you have one."),
  numberedStep(7, "Click 'Save'."),
  heading2("Checklists"),
  numberedStep(1, "Click the 'Checklists' button at the top of the Compliance page."),
  numberedStep(2, "Here you can define which compliance documents are required for each type of assignment."),
  numberedStep(3, "This ensures the system knows what to check for and can flag gaps automatically."),
  heading2("IR35 Questionnaire"),
  para("For IR35 assessments, the system includes a structured questionnaire that helps determine the employment status of a contractor. The result is recorded as a compliance record."),
  tipPara("Set up your compliance checklists first. This tells the system which documents are mandatory, so it can automatically flag gaps."),
  warningPara("Expired or missing compliance documents are a serious business risk. The Compliance Gaps section shows the most urgent issues. Address these immediately."),
  ...questionAnswer("What is IR35?", "IR35 is UK tax legislation that determines whether a contractor is genuinely self-employed or should be treated as an employee for tax purposes."),
  ...questionAnswer("How does the system know a document is expiring?", "The system checks the expiry date you entered. When a document is within 30 days of expiring, its status automatically changes to Expiring."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 11. RATES
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("11. Rates"),
  heading2("What is it?"),
  para("The Rates page is where you manage rate cards. A rate card defines how much you pay a contractor per hour (Pay/Hr) and how much you charge the client per hour (Charge/Hr). The difference is your margin."),
  navInstruction("Rates"),
  heading2("What You See"),
  para("The rate cards table shows:"),
  bullet("Role - The job role the rate applies to (e.g. Electrician, Labourer)."),
  bullet("Location - Where the work is (rates may vary by location)."),
  bullet("Pay/Hr - The hourly rate paid to the contractor."),
  bullet("Charge/Hr - The hourly rate charged to the client company."),
  bullet("Margin % - The profit margin percentage. Green means 30% or above (good). Amber means 20-29% (acceptable). Red means below 20% (low)."),
  bullet("Effective From - When this rate starts."),
  bullet("Effective To - When this rate ends (blank means it is ongoing)."),
  heading2("Adding a New Rate Card"),
  numberedStep(1, "Click the blue 'Add Rate Card' button at the top right."),
  numberedStep(2, "Enter the role name."),
  numberedStep(3, "Enter the location (optional)."),
  numberedStep(4, "Enter the pay rate per hour."),
  numberedStep(5, "Enter the charge rate per hour."),
  numberedStep(6, "Set the effective from date."),
  numberedStep(7, "Optionally set an effective to date."),
  numberedStep(8, "Click 'Save'."),
  heading2("Editing a Rate Card"),
  numberedStep(1, "Click 'Edit' next to the rate card you want to change."),
  numberedStep(2, "Make your changes."),
  numberedStep(3, "Click 'Save'."),
  tipPara("Keep an eye on the margin percentage. If it drops below 20%, you may be undercharging the client or overpaying the contractor."),
  warningPara("Changing a rate card does not automatically change existing invoices or timesheets. It only affects new entries going forward."),
  ...questionAnswer("Can I have different rates for the same role?", "Yes. You can create multiple rate cards for the same role with different locations or different date ranges."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 12. SUPPLIERS
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("12. Suppliers"),
  heading2("What is it?"),
  para("The Suppliers page manages the agencies that supply contractors to PRL. Each supplier has a performance score and a tier rating."),
  navInstruction("Suppliers"),
  heading2("What You See"),
  para("Suppliers are shown as cards (not a table). Each card shows:"),
  bullet("Supplier Name - The name of the agency."),
  bullet("Tier - Their classification (e.g. Gold, Silver, Bronze)."),
  bullet("Number of Contractors - How many contractors they have supplied."),
  bullet("Performance Score - A score out of 100 with a progress bar. Green is 75+, amber is 50-74, red is below 50."),
  bullet("Contact Details - The name, email, and phone number of your contact at that supplier."),
  heading2("Adding a New Supplier"),
  numberedStep(1, "Click the blue 'Add Supplier' button at the top right."),
  numberedStep(2, "Enter the supplier name."),
  numberedStep(3, "Select a tier."),
  numberedStep(4, "Enter the contact name, email, and phone number."),
  numberedStep(5, "Click 'Save'."),
  heading2("Viewing Supplier Details"),
  numberedStep(1, "Click on any supplier card to see their full details."),
  numberedStep(2, "You will see all their contractors, performance history, and contact information."),
  tipPara("Review supplier performance scores regularly. Low-scoring suppliers may need to be addressed or replaced."),
  ...questionAnswer("What determines the performance score?", "The score is based on factors like contractor quality, compliance record, and responsiveness."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 13. ACTIVITY LOG
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("13. Activity Log"),
  heading2("What is it?"),
  para("The Activity Log is a complete record of everything that has happened in the system. Every time someone creates, updates, deletes, approves, rejects, or submits something, it is recorded here. This is your audit trail."),
  navInstruction("Activity Log"),
  heading2("What You See"),
  para("Each entry in the log shows:"),
  bullet("Who did it - The name and email of the person."),
  bullet("What they did - The action (e.g. Created, Updated, Approved, Rejected, Deleted, Logged In, Exported)."),
  bullet("What it affected - The type of record (e.g. Contractor, Timesheet, Invoice, Assignment)."),
  bullet("When it happened - The date and time."),
  bullet("Extra details - Any additional information about the change."),
  heading2("Filtering the Log"),
  numberedStep(1, "Use the 'All Users' dropdown to see only actions by a specific person."),
  numberedStep(2, "Use the 'All Entities' dropdown to see only actions on a specific type of record (e.g. only Timesheet actions)."),
  numberedStep(3, "Click 'Filter' to apply."),
  heading2("Pagination"),
  para("The log shows 50 entries per page. If there are more, use the page numbers at the bottom to move between pages."),
  tipPara("Use the Activity Log when you need to find out who changed something or when a particular action happened. It is essential for audits."),
  ...questionAnswer("Can I delete entries from the Activity Log?", "No. The Activity Log is a permanent record and cannot be edited or deleted. This ensures a complete audit trail."),
  ...questionAnswer("Does the log record login events?", "Yes. Every time someone logs in, it is recorded with a 'Logged In' action."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 14. CONTRACTOR PORTAL
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("14. Contractor Portal"),
  heading2("What is it?"),
  para("The Contractor Portal is a separate area of the app designed specifically for contractors. When a contractor logs in, they see their own portal instead of the main admin system. They can view their assignments, submit timesheets, and see any compliance alerts."),
  heading2("How Contractors Log In"),
  numberedStep(1, "Contractors go to the same login page as everyone else."),
  numberedStep(2, "They enter the email address that was used when they were added to the system."),
  numberedStep(3, "They enter their password (which they set via the forgot password flow the first time)."),
  numberedStep(4, "The system automatically detects they are a contractor and shows them the Contractor Portal."),
  heading2("What Contractors See"),
  heading3("Welcome Section"),
  para("At the top, contractors see a personalised greeting with their name."),
  heading3("Quick Stats"),
  para("Three cards showing:"),
  bullet("Draft Timesheets - How many timesheets they have started but not submitted."),
  bullet("Approved - How many of their timesheets have been approved."),
  bullet("Compliance Alerts - How many of their compliance documents are expiring or expired."),
  heading3("Active Assignments"),
  para("A list of their current assignments showing the role, company name, location, status (Active or Placed), and start date."),
  heading3("Recent Timesheets"),
  para("Their five most recent timesheets showing the week, hours, overtime, and status. Contractors can click 'View all' to see their full timesheet history, or click on any timesheet to see its details."),
  heading3("Compliance Alerts"),
  para("If any of their documents are expiring or expired, a red alert section appears showing which documents need attention and their expiry dates."),
  heading2("Submitting a Timesheet (Contractor View)"),
  numberedStep(1, "From the portal, click on the timesheets section."),
  numberedStep(2, "Click 'New Timesheet' or open a draft timesheet."),
  numberedStep(3, "Select the assignment the hours are for."),
  numberedStep(4, "Enter the hours for each day of the week."),
  numberedStep(5, "Enter any overtime hours."),
  numberedStep(6, "Click 'Submit' to send it for approval."),
  tipPara("Contractors should submit timesheets weekly. The sooner timesheets are submitted, the sooner they can be approved and invoiced."),
  warningPara("Contractors can only see their own data. They cannot see other contractors' information, company details, or billing data."),
  ...questionAnswer("How does a contractor get their first password?", "When a contractor is added to the system, they use the 'Forgot your password?' feature on the login page to set their password for the first time."),
  ...questionAnswer("Can a contractor see invoices?", "No. Contractors can only see their assignments, timesheets, and compliance alerts. They cannot see billing or invoice information."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 15. MOBILE
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("15. Mobile / Add to Home Screen"),
  heading2("What is it?"),
  para("The PRL Site Solutions app works on mobile phones and tablets. It is a Progressive Web App (PWA), which means you can add it to your phone's home screen and use it like a normal app, without downloading it from an app store."),
  heading2("Using the App on Your Phone"),
  para("Simply open the web address in your phone's browser. The app will automatically adjust to fit your screen. Here are the main differences on mobile:"),
  bullet("The left-hand menu is hidden. Tap the three-line icon at the top left to open it."),
  bullet("Tables scroll sideways if they are too wide for your screen."),
  bullet("Buttons and text are slightly larger to make them easier to tap."),
  bullet("There is a logout button in the top right corner for quick access."),
  heading2("Adding to Home Screen (iPhone)"),
  numberedStep(1, "Open Safari and go to the PRL Site Solutions web address."),
  numberedStep(2, "Tap the Share button (the square with an arrow pointing up) at the bottom of the screen."),
  numberedStep(3, "Scroll down and tap 'Add to Home Screen'."),
  numberedStep(4, "Give it a name (or keep the default) and tap 'Add'."),
  numberedStep(5, "The PRL icon will appear on your home screen. Tap it to open the app."),
  heading2("Adding to Home Screen (Android)"),
  numberedStep(1, "Open Chrome and go to the PRL Site Solutions web address."),
  numberedStep(2, "Tap the three dots menu at the top right of Chrome."),
  numberedStep(3, "Tap 'Add to Home screen' or 'Install app'."),
  numberedStep(4, "Tap 'Add' to confirm."),
  numberedStep(5, "The PRL icon will appear on your home screen."),
  heading2("Push Notifications"),
  para("The app supports push notifications. When you first visit the app, you may be asked if you want to allow notifications. Tap 'Allow' to receive alerts about things like timesheet approvals and compliance expiry reminders."),
  heading2("Camera and Document Upload"),
  para("On mobile, you can use your phone's camera to take photos of documents (like CSCS cards or certificates) and upload them directly to compliance records."),
  tipPara("Adding the app to your home screen makes it open in full screen without the browser bar, just like a real app. It is much nicer to use this way."),
  warningPara("You need an internet connection to use the app. It will not work offline."),
  ...questionAnswer("Is there an app in the App Store or Google Play?", "No. The app works through your web browser. But you can add it to your home screen and it will look and feel just like a normal app."),
  ...questionAnswer("Does the mobile app have all the same features?", "Yes. Every feature available on a computer is also available on your phone. The layout just adjusts to fit the smaller screen."),
  pageBreak()
);

// ══════════════════════════════════════════════════════════════════════════════
// 16. TROUBLESHOOTING & FAQ
// ══════════════════════════════════════════════════════════════════════════════

sections.push(
  heading1("16. Troubleshooting & FAQ"),
  heading2("Common Problems and Solutions"),
  heading3("I cannot log in"),
  bullet("Check that your email address is spelled correctly."),
  bullet("Check that your password is correct (passwords are case-sensitive, so 'Password' and 'password' are different)."),
  bullet("Try using the 'Forgot your password?' feature to reset your password."),
  bullet("If you still cannot log in, contact your administrator to check that your account exists."),

  heading3("The page is not loading or is very slow"),
  bullet("Check your internet connection."),
  bullet("Try refreshing the page (press F5 or Ctrl+R on your keyboard)."),
  bullet("Try clearing your browser cache: Settings > Privacy > Clear Browsing Data."),
  bullet("Try a different browser (Chrome, Edge, Safari, or Firefox)."),

  heading3("I cannot see the menu on my phone"),
  bullet("Tap the three-line icon (hamburger menu) at the top left of the screen."),
  bullet("If you still cannot see it, try turning your phone sideways (landscape mode)."),

  heading3("A timesheet or compliance record is missing"),
  bullet("Check that you have the correct filters applied. Click 'All' or clear any search text."),
  bullet("Make sure you are looking at the right date range or status."),
  bullet("Ask your administrator to check the Activity Log for any changes."),

  heading3("An invoice total looks wrong"),
  bullet("Check the timesheet hours that the invoice was generated from."),
  bullet("Check the rate card to make sure the pay and charge rates are correct."),
  bullet("Look at the three-way match status. If it says Partial or Unmatched, there may be a discrepancy."),

  heading3("I accidentally changed something"),
  bullet("Check the Activity Log to see exactly what was changed."),
  bullet("Contact your administrator. They may be able to help you reverse the change."),

  heading2("Frequently Asked Questions"),
  ...questionAnswer("Is my data safe?", "Yes. The app uses secure, encrypted connections (HTTPS) and requires a login to access. Each user can only see the data they are authorised to see."),
  ...questionAnswer("Can I use the app on multiple devices?", "Yes. You can log in from any device with a web browser. Your data is stored online, so it is always the same no matter which device you use."),
  ...questionAnswer("How do I get help if something goes wrong?", "Contact your PRL Site Solutions administrator. They have full access to the system and can investigate issues using the Activity Log."),
  ...questionAnswer("Can I export data to Excel?", "Some sections support data export. Look for export or download buttons on the relevant pages, such as the Sage export in Billing."),
  ...questionAnswer("What browsers are supported?", "The app works best in Google Chrome, Microsoft Edge, Apple Safari, and Mozilla Firefox. Use the latest version of any of these browsers for the best experience."),
  ...questionAnswer("How do I change my email address?", "Contact your administrator. They can update your email address in the Contractors section."),
  ...questionAnswer("Is there a keyboard shortcut to navigate the app?", "The app is designed for mouse and touch use. There are no special keyboard shortcuts, but you can use Tab to move between form fields."),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400 },
    children: [
      new TextRun({ text: "--- End of User Guide ---", font: FONT, size: 22, bold: true, color: GRAY }),
    ],
  }),
  spacer(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "PRL Site Solutions - Recruitment Specialists", font: FONT, size: 20, color: GRAY }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: "For support, contact your system administrator.", font: FONT, size: 20, color: GRAY }),
    ],
  }),
);

// ── Create the Document ──────────────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullet-list",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
              },
            },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 21 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: {
            top: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.2),
            right: convertInchesToTwip(1),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "PRL Site Solutions - User Guide",
                  font: FONT,
                  size: 16,
                  color: GRAY,
                  italics: true,
                }),
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
                new TextRun({ text: "Page ", font: FONT, size: 16, color: GRAY }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: GRAY }),
                new TextRun({ text: " of ", font: FONT, size: 16, color: GRAY }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GRAY }),
              ],
            }),
          ],
        }),
      },
      children: sections,
    },
  ],
});

// ── Write the file ───────────────────────────────────────────────────────────

(async () => {
  try {
    const buffer = await Packer.toBuffer(doc);
    const outputPath = __dirname + "/PRL_Complete_User_Guide.docx";
    fs.writeFileSync(outputPath, buffer);
    console.log("User guide created successfully: " + outputPath);
    console.log("File size: " + (buffer.length / 1024).toFixed(1) + " KB");
  } catch (err) {
    console.error("Error creating document:", err);
    process.exit(1);
  }
})();
