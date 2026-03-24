const pptxgen = require("pptxgenjs");

const pres = new pptxgen();

// Brand colours
const PRIMARY = "005F8C";
const SECONDARY = "00A3E0";
const ACCENT = "F59E0B";
const WHITE = "FFFFFF";
const DARK = "1A1A2E";
const LIGHT_BG = "F8FAFC";
const GREY = "64748B";

// Defaults
pres.defineLayout({ name: "CUSTOM", width: 13.33, height: 7.5 });
pres.layout = "CUSTOM";
pres.author = "PRL Site Solutions";
pres.company = "PRL Site Solutions";
pres.subject = "PRISM Pitch Deck";
pres.title = "PRISM - Workforce Intelligence & Compliance Platform";

// Helper: add blue header bar to a slide
function addHeader(slide, title) {
  // Header background
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 1.2,
    fill: { color: PRIMARY },
  });
  // Title text
  slide.addText(title, {
    x: 0.6, y: 0.2, w: 12, h: 0.8,
    fontSize: 28, fontFace: "Calibri",
    color: WHITE, bold: true,
  });
  // Accent bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 1.2, w: 13.33, h: 0.06,
    fill: { color: ACCENT },
  });
}

// Helper: add a feature box
function addFeatureBox(slide, x, y, w, h, icon, title, desc) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: WHITE },
    shadow: { type: "outer", blur: 6, offset: 2, color: "CCCCCC", opacity: 0.4 },
    rectRadius: 0.1,
  });
  slide.addText(icon, {
    x, y: y + 0.15, w, h: 0.6,
    fontSize: 28, fontFace: "Segoe UI Emoji",
    color: SECONDARY, align: "center",
  });
  slide.addText(title, {
    x: x + 0.15, y: y + 0.75, w: w - 0.3, h: 0.4,
    fontSize: 13, fontFace: "Calibri",
    color: PRIMARY, bold: true, align: "center",
  });
  slide.addText(desc, {
    x: x + 0.15, y: y + 1.1, w: w - 0.3, h: 0.7,
    fontSize: 9.5, fontFace: "Calibri",
    color: GREY, align: "center",
  });
}

// Helper: stat box
function addStatBox(slide, x, y, value, label) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w: 1.85, h: 1.4,
    fill: { color: WHITE },
    shadow: { type: "outer", blur: 6, offset: 2, color: "CCCCCC", opacity: 0.4 },
    rectRadius: 0.1,
  });
  slide.addText(value, {
    x, y: y + 0.15, w: 1.85, h: 0.6,
    fontSize: 28, fontFace: "Calibri",
    color: ACCENT, bold: true, align: "center",
  });
  slide.addText(label, {
    x: x + 0.1, y: y + 0.75, w: 1.65, h: 0.5,
    fontSize: 10, fontFace: "Calibri",
    color: PRIMARY, align: "center",
  });
}

// ─── SLIDE 1: TITLE ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  // Full background
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: { color: PRIMARY },
  });
  // Decorative accent strip
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 3.5, w: 13.33, h: 0.08,
    fill: { color: ACCENT },
  });
  // PRISM logo text
  slide.addText("PRISM", {
    x: 0, y: 1.0, w: 13.33, h: 1.4,
    fontSize: 72, fontFace: "Calibri",
    color: WHITE, bold: true, align: "center",
    charSpacing: 12,
  });
  // Subtitle
  slide.addText("Workforce Intelligence & Compliance Platform", {
    x: 0, y: 2.4, w: 13.33, h: 0.7,
    fontSize: 24, fontFace: "Calibri",
    color: SECONDARY, align: "center",
  });
  // By PRL
  slide.addText("By PRL Site Solutions", {
    x: 0, y: 3.8, w: 13.33, h: 0.6,
    fontSize: 18, fontFace: "Calibri",
    color: WHITE, align: "center",
  });
  // Tagline
  slide.addText("See your workforce clearly.", {
    x: 0, y: 5.0, w: 13.33, h: 0.6,
    fontSize: 20, fontFace: "Calibri",
    color: ACCENT, italic: true, align: "center",
  });
  // Bottom bar
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 7.1, w: 13.33, h: 0.4,
    fill: { color: "003F5C" },
  });
  slide.addText("Confidential | March 2026", {
    x: 0, y: 7.1, w: 13.33, h: 0.4,
    fontSize: 10, fontFace: "Calibri",
    color: GREY, align: "center",
  });
}

// ─── SLIDE 2: THE PROBLEM ───────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "The Problem");

  const problems = [
    { icon: "\u{1F4CA}", title: "Spreadsheet Chaos", desc: "Recruitment agencies juggle dozens of spreadsheets across teams, creating data silos and version conflicts" },
    { icon: "\u{1F6A8}", title: "Compliance Risk", desc: "Manual tracking leads to expired documents, missed renewals, and risk of non-compliance fines up to \u00A320,000+" },
    { icon: "\u{1F4DD}", title: "Paper Timesheets", desc: "300+ timesheets processed manually every Friday. Staff overwhelmed, errors inevitable, billing delayed" },
    { icon: "\u{1F4B8}", title: "Revenue Leakage", desc: "Fragmented billing causes missed hours, incorrect rates, and lost revenue averaging 3-5% of turnover" },
  ];

  problems.forEach((p, i) => {
    const x = 0.6 + i * 3.1;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 1.8, w: 2.8, h: 3.8,
      fill: { color: WHITE },
      shadow: { type: "outer", blur: 8, offset: 3, color: "CCCCCC", opacity: 0.4 },
      rectRadius: 0.12,
    });
    // Red top accent
    slide.addShape(pres.ShapeType.rect, {
      x: x + 0.3, y: 1.8, w: 2.2, h: 0.06,
      fill: { color: "EF4444" },
    });
    slide.addText(p.icon, {
      x, y: 2.1, w: 2.8, h: 0.7,
      fontSize: 36, align: "center",
    });
    slide.addText(p.title, {
      x: x + 0.2, y: 2.8, w: 2.4, h: 0.5,
      fontSize: 15, fontFace: "Calibri",
      color: "EF4444", bold: true, align: "center",
    });
    slide.addText(p.desc, {
      x: x + 0.2, y: 3.4, w: 2.4, h: 1.8,
      fontSize: 11, fontFace: "Calibri",
      color: GREY, align: "center",
    });
  });

  slide.addText("The cost of doing nothing is growing every day.", {
    x: 0, y: 6.2, w: 13.33, h: 0.5,
    fontSize: 16, fontFace: "Calibri",
    color: PRIMARY, italic: true, align: "center",
  });
}

// ─── SLIDE 3: THE SOLUTION ──────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "The Solution");

  slide.addText("PRISM", {
    x: 0, y: 1.6, w: 13.33, h: 0.8,
    fontSize: 40, fontFace: "Calibri",
    color: SECONDARY, bold: true, align: "center",
  });
  slide.addText("One platform for the entire contractor lifecycle", {
    x: 0, y: 2.3, w: 13.33, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: DARK, align: "center",
  });

  // Pipeline flow
  const steps = ["Onboarding", "Compliance", "Assignments", "Timesheets", "Billing", "Intelligence"];
  const startX = 1.2;
  const stepW = 1.7;
  const gap = 0.15;
  steps.forEach((step, i) => {
    const x = startX + i * (stepW + gap);
    // Chevron-style box
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 3.4, w: stepW, h: 1.0,
      fill: { color: i % 2 === 0 ? PRIMARY : SECONDARY },
      rectRadius: 0.08,
    });
    slide.addText(step, {
      x, y: 3.4, w: stepW, h: 1.0,
      fontSize: 13, fontFace: "Calibri",
      color: WHITE, bold: true, align: "center", valign: "middle",
    });
    // Arrow between
    if (i < steps.length - 1) {
      slide.addText("\u25B6", {
        x: x + stepW - 0.05, y: 3.55, w: 0.35, h: 0.7,
        fontSize: 16, color: ACCENT, align: "center", valign: "middle",
      });
    }
  });

  slide.addShape(pres.ShapeType.roundRect, {
    x: 2.5, y: 5.0, w: 8.33, h: 1.2,
    fill: { color: LIGHT_BG },
    rectRadius: 0.1,
  });
  slide.addText([
    { text: "Built for UK recruitment agencies. ", options: { fontSize: 14, color: DARK } },
    { text: "Replaces spreadsheets, paper forms, and manual processes with a single, intelligent platform.", options: { fontSize: 14, color: GREY } },
  ], {
    x: 2.8, y: 5.1, w: 7.73, h: 1.0,
    fontFace: "Calibri", align: "center", valign: "middle",
  });
}

// ─── SLIDE 4: KEY FEATURES OVERVIEW ─────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Key Features Overview");

  const features = [
    { icon: "\u{1F464}", title: "Contractor Management", desc: "Full lifecycle from onboarding to offboarding with centralised profiles" },
    { icon: "\u{1F6E1}\uFE0F", title: "Compliance Engine", desc: "85%+ risk scoring, auto-expiry alerts, configurable checklists" },
    { icon: "\u{1F4CB}", title: "Kanban Assignments", desc: "Visual drag-and-drop board for contractor placement and tracking" },
    { icon: "\u23F1\uFE0F", title: "Smart Timesheets", desc: "Mobile self-service, auto-overtime, UK bank holiday detection" },
    { icon: "\u{1F4B7}", title: "Automated Billing", desc: "Invoice generation from approved timesheets, Sage CSV export" },
    { icon: "\u{1F4A1}", title: "Workforce Intelligence", desc: "Predictive analytics, anomaly detection, actionable insights" },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 4.1;
    const y = 1.7 + row * 2.5;
    addFeatureBox(slide, x, y, 3.6, 2.0, f.icon, f.title, f.desc);
  });
}

// ─── SLIDE 5: COMPLIANCE THAT WORKS ─────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Compliance That Works");

  // Left panel - features list
  const items = [
    "Auto-expiry detection with configurable lead times",
    "Real-time risk scoring across all contractors",
    "Configurable compliance checklists per role",
    "IR35 determination and status tracking",
    "Gap analysis with remediation guidance",
    "Document verification and audit trail",
    "Automated renewal reminders via email and PWA",
  ];

  items.forEach((item, i) => {
    slide.addText([
      { text: "\u2713 ", options: { color: "10B981", bold: true, fontSize: 14 } },
      { text: item, options: { color: DARK, fontSize: 13 } },
    ], {
      x: 0.8, y: 1.7 + i * 0.55, w: 6.5, h: 0.5,
      fontFace: "Calibri",
    });
  });

  // Right panel - big stat
  slide.addShape(pres.ShapeType.roundRect, {
    x: 8.0, y: 1.8, w: 4.5, h: 4.5,
    fill: { color: PRIMARY },
    rectRadius: 0.15,
  });
  slide.addText("85%", {
    x: 8.0, y: 2.2, w: 4.5, h: 1.5,
    fontSize: 64, fontFace: "Calibri",
    color: ACCENT, bold: true, align: "center",
  });
  slide.addText("Compliance\nConfidence Score", {
    x: 8.0, y: 3.6, w: 4.5, h: 1.0,
    fontSize: 20, fontFace: "Calibri",
    color: WHITE, bold: true, align: "center",
  });
  slide.addText("with real-time monitoring", {
    x: 8.0, y: 4.6, w: 4.5, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: SECONDARY, align: "center",
  });
}

// ─── SLIDE 6: TIMESHEETS REIMAGINED ─────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Timesheets Reimagined");

  const features = [
    { title: "Contractor Self-Service", desc: "Submit timesheets via mobile PWA - no app download needed" },
    { title: "Weekly Grouping", desc: "Automatic weekly grouping with configurable week start days" },
    { title: "Auto-Overtime", desc: "Intelligent overtime calculation with UK bank holiday detection" },
    { title: "Exception-Based Approval", desc: "Only flagged timesheets need manual review - save hours weekly" },
    { title: "Full Audit Trail", desc: "Every change tracked with timestamps, user IDs, and approval chain" },
    { title: "Multi-Rate Support", desc: "Handle standard, overtime, weekend, and holiday rates per assignment" },
  ];

  features.forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.8 + col * 6.2;
    const y = 1.7 + row * 1.7;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w: 5.8, h: 1.3,
      fill: { color: WHITE },
      shadow: { type: "outer", blur: 4, offset: 2, color: "CCCCCC", opacity: 0.3 },
      rectRadius: 0.08,
    });
    // Accent left bar
    slide.addShape(pres.ShapeType.rect, {
      x, y: y + 0.15, w: 0.08, h: 1.0,
      fill: { color: SECONDARY },
    });
    slide.addText(f.title, {
      x: x + 0.3, y, w: 5.2, h: 0.55,
      fontSize: 14, fontFace: "Calibri",
      color: PRIMARY, bold: true, valign: "bottom",
    });
    slide.addText(f.desc, {
      x: x + 0.3, y: y + 0.55, w: 5.2, h: 0.55,
      fontSize: 11.5, fontFace: "Calibri",
      color: GREY, valign: "top",
    });
  });

  slide.addText("\"Friday timesheet panic is over.\"", {
    x: 0, y: 6.3, w: 13.33, h: 0.5,
    fontSize: 16, fontFace: "Calibri",
    color: ACCENT, italic: true, bold: true, align: "center",
  });
}

// ─── SLIDE 7: BILLING & INVOICING ──────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Billing & Invoicing");

  // Left side - flow
  const flowSteps = [
    { num: "1", text: "Timesheets approved" },
    { num: "2", text: "Invoices auto-generated" },
    { num: "3", text: "3-way matching (PO / Timesheet / Invoice)" },
    { num: "4", text: "Sage CSV export for accounts" },
    { num: "5", text: "Spend dashboards with variance alerts" },
  ];

  flowSteps.forEach((s, i) => {
    const y = 1.8 + i * 0.9;
    slide.addShape(pres.ShapeType.ellipse, {
      x: 1.0, y: y + 0.05, w: 0.55, h: 0.55,
      fill: { color: i === 2 ? ACCENT : SECONDARY },
    });
    slide.addText(s.num, {
      x: 1.0, y: y + 0.05, w: 0.55, h: 0.55,
      fontSize: 16, fontFace: "Calibri",
      color: WHITE, bold: true, align: "center", valign: "middle",
    });
    slide.addText(s.text, {
      x: 1.8, y, w: 5.0, h: 0.65,
      fontSize: 14, fontFace: "Calibri",
      color: DARK, valign: "middle",
    });
    if (i < flowSteps.length - 1) {
      slide.addShape(pres.ShapeType.rect, {
        x: 1.24, y: y + 0.6, w: 0.06, h: 0.35,
        fill: { color: "CBD5E1" },
      });
    }
  });

  // Right side - highlight box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 7.5, y: 1.8, w: 5.0, h: 4.5,
    fill: { color: LIGHT_BG },
    rectRadius: 0.12,
  });
  slide.addText("Key Benefits", {
    x: 7.5, y: 2.0, w: 5.0, h: 0.6,
    fontSize: 18, fontFace: "Calibri",
    color: PRIMARY, bold: true, align: "center",
  });

  const benefits = [
    "Eliminate manual invoice creation",
    "Catch billing discrepancies early",
    "Real-time spend visibility per client",
    "Variance alerts flag anomalies",
    "Seamless Sage integration",
    "Complete audit trail",
  ];

  benefits.forEach((b, i) => {
    slide.addText([
      { text: "\u25C6 ", options: { color: ACCENT, fontSize: 12 } },
      { text: b, options: { color: DARK, fontSize: 12 } },
    ], {
      x: 8.0, y: 2.7 + i * 0.55, w: 4.3, h: 0.45,
      fontFace: "Calibri",
    });
  });
}

// ─── SLIDE 8: WORKFORCE INTELLIGENCE ────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Workforce Intelligence");

  slide.addText("AI-powered without the AI price tag", {
    x: 0, y: 1.5, w: 13.33, h: 0.6,
    fontSize: 20, fontFace: "Calibri",
    color: ACCENT, italic: true, align: "center",
  });

  const intel = [
    { icon: "\u{1F50D}", title: "Smart Contractor Matching", desc: "Match contractors to assignments based on skills, availability, compliance status, and historical performance" },
    { icon: "\u{1F4C8}", title: "Predictive Risk Engine", desc: "Forecast compliance gaps before they happen. Identify at-risk contractors and proactive interventions" },
    { icon: "\u26A0\uFE0F", title: "Anomaly Detection", desc: "Flag unusual timesheet patterns, billing discrepancies, and compliance deviations automatically" },
    { icon: "\u{1F4CA}", title: "Actionable Insights", desc: "Dashboard-driven analytics with drill-down reports. Export to PDF or share with stakeholders" },
  ];

  intel.forEach((item, i) => {
    const x = 0.6 + i * 3.15;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 2.5, w: 2.9, h: 3.5,
      fill: { color: WHITE },
      shadow: { type: "outer", blur: 6, offset: 2, color: "CCCCCC", opacity: 0.35 },
      rectRadius: 0.1,
    });
    slide.addText(item.icon, {
      x, y: 2.7, w: 2.9, h: 0.7,
      fontSize: 32, align: "center",
    });
    slide.addText(item.title, {
      x: x + 0.15, y: 3.4, w: 2.6, h: 0.5,
      fontSize: 13, fontFace: "Calibri",
      color: PRIMARY, bold: true, align: "center",
    });
    slide.addText(item.desc, {
      x: x + 0.15, y: 3.9, w: 2.6, h: 1.8,
      fontSize: 10.5, fontFace: "Calibri",
      color: GREY, align: "center",
    });
  });
}

// ─── SLIDE 9: CONTRACTOR SELF-SERVICE ───────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Contractor Self-Service");

  slide.addText("Mobile PWA - No App Store Needed", {
    x: 0, y: 1.5, w: 13.33, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: SECONDARY, align: "center",
  });

  // Phone mockup area
  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.0, y: 2.3, w: 3.5, h: 4.2,
    fill: { color: DARK },
    rectRadius: 0.3,
  });
  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.15, y: 2.5, w: 3.2, h: 3.8,
    fill: { color: WHITE },
    rectRadius: 0.15,
  });
  // Mock screen content
  const screenItems = ["Dashboard", "Submit Timesheet", "Upload Documents", "My Compliance", "Profile"];
  screenItems.forEach((item, i) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.35, y: 2.7 + i * 0.65, w: 2.8, h: 0.5,
      fill: { color: i === 1 ? SECONDARY : LIGHT_BG },
      rectRadius: 0.05,
    });
    slide.addText(item, {
      x: 1.35, y: 2.7 + i * 0.65, w: 2.8, h: 0.5,
      fontSize: 11, fontFace: "Calibri",
      color: i === 1 ? WHITE : DARK, align: "center", valign: "middle",
    });
  });

  // Right side features
  const selfServiceFeatures = [
    { title: "Timesheet Submission", desc: "Quick weekly entry with smart defaults and auto-save" },
    { title: "Document Upload", desc: "Camera capture or file upload for certificates and IDs" },
    { title: "Compliance Tracking", desc: "See your compliance status and upcoming expiries" },
    { title: "Profile Management", desc: "Update contact details, skills, and availability" },
    { title: "Push Notifications", desc: "Alerts for approvals, expiries, and new assignments" },
  ];

  selfServiceFeatures.forEach((f, i) => {
    slide.addText(f.title, {
      x: 5.5, y: 2.2 + i * 0.9, w: 7.0, h: 0.35,
      fontSize: 14, fontFace: "Calibri",
      color: PRIMARY, bold: true,
    });
    slide.addText(f.desc, {
      x: 5.5, y: 2.55 + i * 0.9, w: 7.0, h: 0.35,
      fontSize: 11.5, fontFace: "Calibri",
      color: GREY,
    });
  });
}

// ─── SLIDE 10: ISO 9001 READY ───────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "ISO 9001:2015 Ready");

  slide.addText("Built-in Quality Management System", {
    x: 0, y: 1.5, w: 13.33, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: SECONDARY, align: "center",
  });

  const modules = [
    { icon: "\u{1F4DD}", title: "NCR/CAPA Register", desc: "Non-conformance and corrective action tracking" },
    { icon: "\u{1F50E}", title: "Internal Audits", desc: "Schedule, conduct, and track audit findings" },
    { icon: "\u26A0\uFE0F", title: "Risk Register", desc: "Identify, assess, and mitigate organisational risks" },
    { icon: "\u{1F4CB}", title: "Management Review", desc: "Structured review meetings with action tracking" },
    { icon: "\u{1F4D6}", title: "Quality Policy", desc: "Document control with version history" },
    { icon: "\u{1F4C8}", title: "Continual Improvement", desc: "Log and track improvement initiatives" },
  ];

  modules.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.8 + col * 4.1;
    const y = 2.3 + row * 2.3;
    addFeatureBox(slide, x, y, 3.6, 1.9, m.icon, m.title, m.desc);
  });

  slide.addText("Audit-ready from day one. No separate QMS software needed.", {
    x: 0, y: 6.5, w: 13.33, h: 0.5,
    fontSize: 14, fontFace: "Calibri",
    color: PRIMARY, italic: true, align: "center",
  });
}

// ─── SLIDE 11: THE NUMBERS ──────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "The Numbers");

  slide.addText("Proven performance in production", {
    x: 0, y: 1.5, w: 13.33, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: GREY, align: "center",
  });

  const stats = [
    { value: "320+", label: "Contractors\nManaged" },
    { value: "300+", label: "Timesheets\nWeekly" },
    { value: "85%", label: "Compliance\nScore" },
    { value: "12", label: "Companies\nTracked" },
    { value: "6", label: "QMS\nModules" },
    { value: "<3s", label: "Page\nLoad Time" },
  ];

  stats.forEach((s, i) => {
    const x = 0.6 + i * 2.1;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 2.5, w: 1.85, h: 2.2,
      fill: { color: WHITE },
      shadow: { type: "outer", blur: 8, offset: 3, color: "CCCCCC", opacity: 0.4 },
      rectRadius: 0.12,
    });
    slide.addText(s.value, {
      x, y: 2.7, w: 1.85, h: 1.0,
      fontSize: 36, fontFace: "Calibri",
      color: ACCENT, bold: true, align: "center",
    });
    slide.addText(s.label, {
      x: x + 0.1, y: 3.7, w: 1.65, h: 0.8,
      fontSize: 12, fontFace: "Calibri",
      color: PRIMARY, align: "center",
    });
  });

  // Bottom highlight
  slide.addShape(pres.ShapeType.roundRect, {
    x: 2.5, y: 5.3, w: 8.33, h: 1.2,
    fill: { color: PRIMARY },
    rectRadius: 0.1,
  });
  slide.addText("Live in production. Real data. Real results.", {
    x: 2.5, y: 5.3, w: 8.33, h: 1.2,
    fontSize: 22, fontFace: "Calibri",
    color: WHITE, bold: true, align: "center", valign: "middle",
  });
}

// ─── SLIDE 12: PRICING ──────────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Pricing");

  const plans = [
    {
      name: "Starter", price: "\u00A3299", period: "/month",
      features: ["Up to 50 contractors", "Core compliance engine", "Timesheet management", "Basic reporting", "Email support"],
      highlight: false,
    },
    {
      name: "Professional", price: "\u00A3599", period: "/month",
      features: ["Up to 200 contractors", "Full compliance suite", "Automated billing", "Workforce intelligence", "Priority support"],
      highlight: true,
    },
    {
      name: "Enterprise", price: "\u00A3999", period: "/month",
      features: ["Unlimited contractors", "All Professional features", "ISO 9001 QMS module", "Custom integrations", "Dedicated account manager"],
      highlight: false,
    },
    {
      name: "White-Label", price: "\u00A31,499", period: "/month",
      features: ["Your brand, our platform", "Unlimited contractors", "All Enterprise features", "Custom domain & branding", "API access"],
      highlight: false,
    },
  ];

  plans.forEach((plan, i) => {
    const x = 0.5 + i * 3.2;
    const w = 2.9;
    const isHighlight = plan.highlight;

    slide.addShape(pres.ShapeType.roundRect, {
      x, y: isHighlight ? 1.5 : 1.7, w, h: isHighlight ? 5.3 : 5.0,
      fill: { color: isHighlight ? PRIMARY : WHITE },
      shadow: { type: "outer", blur: 8, offset: 3, color: "CCCCCC", opacity: 0.5 },
      rectRadius: 0.12,
      line: isHighlight ? { color: ACCENT, width: 2 } : undefined,
    });

    if (isHighlight) {
      slide.addShape(pres.ShapeType.roundRect, {
        x: x + 0.5, y: 1.3, w: w - 1.0, h: 0.4,
        fill: { color: ACCENT },
        rectRadius: 0.06,
      });
      slide.addText("MOST POPULAR", {
        x: x + 0.5, y: 1.3, w: w - 1.0, h: 0.4,
        fontSize: 10, fontFace: "Calibri",
        color: WHITE, bold: true, align: "center", valign: "middle",
      });
    }

    const textColor = isHighlight ? WHITE : DARK;
    const subColor = isHighlight ? "A8D8F0" : GREY;

    slide.addText(plan.name, {
      x, y: isHighlight ? 1.7 : 1.9, w, h: 0.5,
      fontSize: 18, fontFace: "Calibri",
      color: isHighlight ? ACCENT : PRIMARY, bold: true, align: "center",
    });
    slide.addText(plan.price, {
      x, y: isHighlight ? 2.2 : 2.4, w, h: 0.8,
      fontSize: 32, fontFace: "Calibri",
      color: textColor, bold: true, align: "center",
    });
    slide.addText(plan.period, {
      x, y: isHighlight ? 2.85 : 3.05, w, h: 0.3,
      fontSize: 12, fontFace: "Calibri",
      color: subColor, align: "center",
    });

    plan.features.forEach((feat, fi) => {
      slide.addText([
        { text: "\u2713 ", options: { color: isHighlight ? ACCENT : "10B981", bold: true } },
        { text: feat, options: { color: textColor } },
      ], {
        x: x + 0.25, y: (isHighlight ? 3.4 : 3.6) + fi * 0.55, w: w - 0.5, h: 0.45,
        fontSize: 11, fontFace: "Calibri",
      });
    });
  });
}

// ─── SLIDE 13: CASE STUDY ───────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Case Study: PRL Site Solutions");

  // Large quote box
  slide.addShape(pres.ShapeType.roundRect, {
    x: 1.0, y: 1.8, w: 11.33, h: 4.8,
    fill: { color: LIGHT_BG },
    rectRadius: 0.15,
  });

  // Quote marks
  slide.addText("\u201C", {
    x: 1.3, y: 1.7, w: 1.0, h: 1.0,
    fontSize: 72, fontFace: "Georgia",
    color: SECONDARY,
  });

  const casePoints = [
    { label: "Deployment", value: "Built and deployed in 3 days" },
    { label: "Scale", value: "Managing 320 contractors across 12 companies" },
    { label: "Quality", value: "ISO 9001:2015 audit-ready with full QMS" },
    { label: "Impact", value: "Replaced manual spreadsheets entirely" },
    { label: "Result", value: "Achieved 85% compliance confidence score" },
  ];

  casePoints.forEach((p, i) => {
    slide.addShape(pres.ShapeType.roundRect, {
      x: 1.8, y: 2.5 + i * 0.75, w: 2.0, h: 0.55,
      fill: { color: PRIMARY },
      rectRadius: 0.06,
    });
    slide.addText(p.label, {
      x: 1.8, y: 2.5 + i * 0.75, w: 2.0, h: 0.55,
      fontSize: 12, fontFace: "Calibri",
      color: WHITE, bold: true, align: "center", valign: "middle",
    });
    slide.addText(p.value, {
      x: 4.1, y: 2.5 + i * 0.75, w: 7.5, h: 0.55,
      fontSize: 15, fontFace: "Calibri",
      color: DARK, valign: "middle",
    });
  });

  slide.addText("\u201D", {
    x: 11.3, y: 5.5, w: 1.0, h: 1.0,
    fontSize: 72, fontFace: "Georgia",
    color: SECONDARY,
  });

  slide.addText("PRL Site Solutions  |  Live since 2025", {
    x: 0, y: 6.5, w: 13.33, h: 0.4,
    fontSize: 13, fontFace: "Calibri",
    color: GREY, align: "center",
  });
}

// ─── SLIDE 14: NEXT STEPS ───────────────────────────────────────
{
  const slide = pres.addSlide();
  addHeader(slide, "Next Steps");

  const steps = [
    { num: "01", title: "Free Demo", desc: "See PRISM in action with your data. 30-minute walkthrough with our team.", color: SECONDARY },
    { num: "02", title: "14-Day Free Trial", desc: "Full platform access. No credit card required. Import your contractors and go.", color: PRIMARY },
    { num: "03", title: "Dedicated Onboarding", desc: "White-glove setup with data migration, training, and go-live support.", color: ACCENT },
  ];

  steps.forEach((s, i) => {
    const x = 0.8 + i * 4.1;
    slide.addShape(pres.ShapeType.roundRect, {
      x, y: 1.8, w: 3.7, h: 3.8,
      fill: { color: WHITE },
      shadow: { type: "outer", blur: 8, offset: 3, color: "CCCCCC", opacity: 0.4 },
      rectRadius: 0.12,
    });
    // Number circle
    slide.addShape(pres.ShapeType.ellipse, {
      x: x + 1.25, y: 2.1, w: 1.2, h: 1.2,
      fill: { color: s.color },
    });
    slide.addText(s.num, {
      x: x + 1.25, y: 2.1, w: 1.2, h: 1.2,
      fontSize: 28, fontFace: "Calibri",
      color: WHITE, bold: true, align: "center", valign: "middle",
    });
    slide.addText(s.title, {
      x: x + 0.2, y: 3.5, w: 3.3, h: 0.5,
      fontSize: 18, fontFace: "Calibri",
      color: PRIMARY, bold: true, align: "center",
    });
    slide.addText(s.desc, {
      x: x + 0.3, y: 4.1, w: 3.1, h: 1.2,
      fontSize: 12, fontFace: "Calibri",
      color: GREY, align: "center",
    });
  });

  // Contact info
  slide.addShape(pres.ShapeType.roundRect, {
    x: 2.0, y: 6.0, w: 9.33, h: 1.0,
    fill: { color: PRIMARY },
    rectRadius: 0.08,
  });
  slide.addText("hello@prlsitesolutions.co.uk  |  prlsitesolutions.co.uk  |  0333 XXX XXXX", {
    x: 2.0, y: 6.0, w: 9.33, h: 1.0,
    fontSize: 14, fontFace: "Calibri",
    color: WHITE, align: "center", valign: "middle",
  });
}

// ─── SLIDE 15: THANK YOU ────────────────────────────────────────
{
  const slide = pres.addSlide();
  // Full background
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 7.5,
    fill: { color: PRIMARY },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: 0, y: 3.8, w: 13.33, h: 0.08,
    fill: { color: ACCENT },
  });

  slide.addText("Thank You", {
    x: 0, y: 1.2, w: 13.33, h: 1.0,
    fontSize: 52, fontFace: "Calibri",
    color: WHITE, bold: true, align: "center",
  });
  slide.addText("See your workforce clearly through every PRISM", {
    x: 0, y: 2.4, w: 13.33, h: 0.7,
    fontSize: 22, fontFace: "Calibri",
    color: ACCENT, italic: true, align: "center",
  });

  // Contact block
  slide.addShape(pres.ShapeType.roundRect, {
    x: 3.5, y: 4.3, w: 6.33, h: 2.2,
    fill: { color: "004A6E" },
    rectRadius: 0.12,
  });
  slide.addText("PRL Site Solutions", {
    x: 3.5, y: 4.4, w: 6.33, h: 0.5,
    fontSize: 18, fontFace: "Calibri",
    color: WHITE, bold: true, align: "center",
  });
  slide.addText("hello@prlsitesolutions.co.uk\nprlsitesolutions.co.uk\n0333 XXX XXXX", {
    x: 3.5, y: 4.9, w: 6.33, h: 1.4,
    fontSize: 14, fontFace: "Calibri",
    color: "A8D8F0", align: "center",
    lineSpacingMultiple: 1.5,
  });

  slide.addText("PRISM", {
    x: 0, y: 7.0, w: 13.33, h: 0.4,
    fontSize: 11, fontFace: "Calibri",
    color: GREY, align: "center",
    charSpacing: 6,
  });
}

// ─── WRITE FILE ─────────────────────────────────────────────────
const filePath = "C:\\Users\\LAPTOP80\\OneDrive - prlsitesolutions.co.uk\\Desktop\\prl_req\\PRISM_Pitch_Deck.pptx";
pres.writeFile({ fileName: filePath })
  .then(() => console.log("SUCCESS: Pitch deck saved to " + filePath))
  .catch((err) => console.error("ERROR:", err));
