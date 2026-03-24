const ExcelJS = require("exceljs");
const path = require("path");

async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "PRL Site Solutions";
  wb.created = new Date();

  // ── Colour constants ──
  const BRAND_BLUE = "005F8C";
  const SECTION_BLUE = "007AAD";
  const INPUT_YELLOW = "FFFFCC";
  const RESULT_GREEN = "D4EDDA";
  const LIGHT_GREEN = "E8F4E8";
  const LIGHT_BLUE = "E3F2FD";
  const LIGHT_GREY = "F8F9FA";
  const WARNING_YELLOW = "FFF3CD";

  const thinBorder = {
    top: { style: "thin", color: { argb: "FFCCCCCC" } },
    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    left: { style: "thin", color: { argb: "FFCCCCCC" } },
    right: { style: "thin", color: { argb: "FFCCCCCC" } },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 1: ROI Calculator
  // ═══════════════════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet("ROI Calculator", {
    properties: { tabColor: { argb: "FF005F8C" } },
  });

  ws1.columns = [
    { width: 44 },
    { width: 32 },
    { width: 24 },
  ];

  // ── Title ──
  let r = 1;
  ws1.mergeCells(`A${r}:C${r}`);
  const titleCell = ws1.getCell(`A${r}`);
  titleCell.value = "PRISM Workforce Platform — ROI Calculator";
  titleCell.font = { bold: true, size: 18, color: { argb: `FF${BRAND_BLUE}` } };
  titleCell.alignment = { horizontal: "left" };
  r++;

  ws1.mergeCells(`A${r}:C${r}`);
  const subCell = ws1.getCell(`A${r}`);
  subCell.value = "See how much PRISM can save your business vs manual processes or competitors";
  subCell.font = { italic: true, size: 11, color: { argb: "FF666666" } };
  r += 2;

  // ── Helper: section header row ──
  function sectionHeader(sheet, row, text) {
    ["A", "B", "C"].forEach((col) => {
      const cell = sheet.getCell(`${col}${row}`);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${SECTION_BLUE}` } };
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.border = thinBorder;
    });
    sheet.getCell(`A${row}`).value = text;
  }

  function labelCell(sheet, row, col, text) {
    const cell = sheet.getCell(`${col}${row}`);
    cell.value = text;
    cell.font = { size: 10 };
    cell.border = thinBorder;
    cell.alignment = { wrapText: true };
    return cell;
  }

  function hintCell(sheet, row, text) {
    const cell = sheet.getCell(`B${row}`);
    cell.value = text;
    cell.font = { size: 9, italic: true, color: { argb: "FF888888" } };
    cell.border = thinBorder;
    return cell;
  }

  function inputCell(sheet, row, value, fmt) {
    const cell = sheet.getCell(`C${row}`);
    cell.value = value;
    cell.numFmt = fmt || "#,##0";
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${INPUT_YELLOW}` } };
    cell.border = thinBorder;
    cell.protection = { locked: false };
    return cell;
  }

  function formulaCell(sheet, row, formula, fmt) {
    const cell = sheet.getCell(`C${row}`);
    cell.value = { formula };
    cell.numFmt = fmt || '£#,##0';
    cell.border = thinBorder;
    return cell;
  }

  // ── INPUT SECTION ──
  sectionHeader(ws1, r, "YOUR BUSINESS DETAILS");
  ws1.getCell(`C${r}`).value = "Enter your values in yellow cells";
  r++;

  const inputStart = r;
  const inputs = [
    { label: "Number of contractors", default: 50, fmt: "#,##0" },
    { label: "Number of staff managing contractors", default: 3, fmt: "#,##0" },
    { label: "Average hourly rate of admin staff", default: 15, fmt: "£#,##0" },
    { label: "Hours per week — manual timesheet processing", default: 10, fmt: "#,##0" },
    { label: "Hours per week — compliance tracking", default: 8, fmt: "#,##0" },
    { label: "Hours per week — billing/invoicing", default: 6, fmt: "#,##0" },
    { label: "Hours per week — data entry/reporting", default: 4, fmt: "#,##0" },
    { label: "Current monthly software cost (if any)", default: 0, fmt: "£#,##0" },
    { label: "Average billing errors per month", default: 3, fmt: "#,##0" },
    { label: "Average value per billing error", default: 500, fmt: "£#,##0" },
    { label: "Compliance fines risk per year", default: 5000, fmt: "£#,##0" },
  ];

  const inputRows = {};
  inputs.forEach((inp) => {
    labelCell(ws1, r, "A", inp.label);
    inputCell(ws1, r, inp.default, inp.fmt);
    inputRows[inp.label] = r;
    r++;
  });

  // Named row references
  const R = {
    contractors: inputRows["Number of contractors"],
    staff: inputRows["Number of staff managing contractors"],
    rate: inputRows["Average hourly rate of admin staff"],
    timesheet: inputRows["Hours per week — manual timesheet processing"],
    compliance: inputRows["Hours per week — compliance tracking"],
    billing: inputRows["Hours per week — billing/invoicing"],
    dataEntry: inputRows["Hours per week — data entry/reporting"],
    software: inputRows["Current monthly software cost (if any)"],
    errors: inputRows["Average billing errors per month"],
    errorVal: inputRows["Average value per billing error"],
    fines: inputRows["Compliance fines risk per year"],
  };

  r++;

  // ── CURRENT COSTS SECTION ──
  sectionHeader(ws1, r, "CURRENT ANNUAL COSTS (Without PRISM)");
  r++;

  // Admin time cost
  const adminCostRow = r;
  labelCell(ws1, r, "A", "Annual admin time cost");
  hintCell(ws1, r, "Staff x weekly hours x rate x 52");
  formulaCell(ws1, r, `C${R.staff}*(C${R.timesheet}+C${R.compliance}+C${R.billing}+C${R.dataEntry})*C${R.rate}*52`);
  r++;

  // Billing error cost
  const errorCostRow = r;
  labelCell(ws1, r, "A", "Annual billing error cost");
  hintCell(ws1, r, "Errors x value x 12");
  formulaCell(ws1, r, `C${R.errors}*C${R.errorVal}*12`);
  r++;

  // Compliance risk
  const compRiskRow = r;
  labelCell(ws1, r, "A", "Annual compliance risk");
  formulaCell(ws1, r, `C${R.fines}`);
  r++;

  // Current software cost
  const currSoftRow = r;
  labelCell(ws1, r, "A", "Annual software cost");
  formulaCell(ws1, r, `C${R.software}*12`);
  r++;

  // TOTAL CURRENT
  const totalCurrentRow = r;
  const tcLabel = ws1.getCell(`A${r}`);
  tcLabel.value = "TOTAL CURRENT ANNUAL COST";
  tcLabel.font = { bold: true, size: 11 };
  tcLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${WARNING_YELLOW}` } };
  tcLabel.border = thinBorder;
  const tcVal = formulaCell(ws1, r, `C${adminCostRow}+C${errorCostRow}+C${compRiskRow}+C${currSoftRow}`);
  tcVal.font = { bold: true, size: 11 };
  tcVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT_GREEN}` } };
  r += 2;

  // ── WITH PRISM SECTION ──
  sectionHeader(ws1, r, "WITH PRISM");
  r++;

  // Time reduction
  const timeRedRow = r;
  labelCell(ws1, r, "A", "Estimated admin time reduction");
  const trCell = ws1.getCell(`C${r}`);
  trCell.value = 0.70;
  trCell.numFmt = "0%";
  trCell.border = thinBorder;
  r++;

  // PRISM annual cost (tiered)
  const prismCostRow = r;
  labelCell(ws1, r, "A", "PRISM annual cost (tiered pricing)");
  hintCell(ws1, r, "Based on contractor count");
  formulaCell(ws1, r, `IF(C${R.contractors}<=25,199*12,IF(C${R.contractors}<=100,399*12,IF(C${R.contractors}<=250,699*12,999*12)))`);
  r++;

  // Billing error reduction
  const errRedRow = r;
  labelCell(ws1, r, "A", "Estimated billing error reduction");
  const erCell = ws1.getCell(`C${r}`);
  erCell.value = 0.90;
  erCell.numFmt = "0%";
  erCell.border = thinBorder;
  r++;

  // Compliance risk reduction
  const compRedRow = r;
  labelCell(ws1, r, "A", "Estimated compliance risk reduction");
  const crCell = ws1.getCell(`C${r}`);
  crCell.value = 0.85;
  crCell.numFmt = "0%";
  crCell.border = thinBorder;
  r++;

  // Remaining admin cost
  const remainAdminRow = r;
  labelCell(ws1, r, "A", "Remaining admin time cost");
  formulaCell(ws1, r, `C${adminCostRow}*(1-C${timeRedRow})`);
  r++;

  // Remaining billing errors
  const remainErrorRow = r;
  labelCell(ws1, r, "A", "Remaining billing error cost");
  formulaCell(ws1, r, `C${errorCostRow}*(1-C${errRedRow})`);
  r++;

  // Remaining compliance risk
  const remainCompRow = r;
  labelCell(ws1, r, "A", "Remaining compliance risk");
  formulaCell(ws1, r, `C${compRiskRow}*(1-C${compRedRow})`);
  r++;

  // TOTAL WITH PRISM
  const totalPrismRow = r;
  const tpLabel = ws1.getCell(`A${r}`);
  tpLabel.value = "TOTAL ANNUAL COST WITH PRISM";
  tpLabel.font = { bold: true, size: 11 };
  tpLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${WARNING_YELLOW}` } };
  tpLabel.border = thinBorder;
  const tpVal = formulaCell(ws1, r, `C${remainAdminRow}+C${remainErrorRow}+C${remainCompRow}+C${prismCostRow}`);
  tpVal.font = { bold: true, size: 11 };
  tpVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT_GREEN}` } };
  r += 2;

  // ── SAVINGS SUMMARY ──
  sectionHeader(ws1, r, "YOUR SAVINGS WITH PRISM");
  r++;

  // Annual savings
  const annSavRow = r;
  const asLabel = ws1.getCell(`A${r}`);
  asLabel.value = "ANNUAL SAVINGS";
  asLabel.font = { bold: true, size: 13 };
  asLabel.border = thinBorder;
  const asVal = formulaCell(ws1, r, `C${totalCurrentRow}-C${totalPrismRow}`);
  asVal.font = { bold: true, size: 14, color: { argb: `FF${BRAND_BLUE}` } };
  asVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${RESULT_GREEN}` } };
  r++;

  // Monthly savings
  const mLabel = ws1.getCell(`A${r}`);
  mLabel.value = "MONTHLY SAVINGS";
  mLabel.font = { bold: true, size: 13 };
  mLabel.border = thinBorder;
  const mVal = formulaCell(ws1, r, `C${annSavRow}/12`);
  mVal.font = { bold: true, size: 14, color: { argb: `FF${BRAND_BLUE}` } };
  mVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${RESULT_GREEN}` } };
  r++;

  // ROI %
  const roiLabel = ws1.getCell(`A${r}`);
  roiLabel.value = "RETURN ON INVESTMENT (ROI)";
  roiLabel.font = { bold: true, size: 13 };
  roiLabel.border = thinBorder;
  const roiVal = ws1.getCell(`C${r}`);
  roiVal.value = { formula: `IF(C${prismCostRow}>0,(C${annSavRow}/C${prismCostRow})*100,0)` };
  roiVal.numFmt = '#,##0"%"';
  roiVal.font = { bold: true, size: 14, color: { argb: `FF${BRAND_BLUE}` } };
  roiVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${RESULT_GREEN}` } };
  roiVal.border = thinBorder;
  r++;

  // Payback period
  const pbLabel = ws1.getCell(`A${r}`);
  pbLabel.value = "PAYBACK PERIOD";
  pbLabel.font = { bold: true, size: 13 };
  pbLabel.border = thinBorder;
  const pbVal = ws1.getCell(`C${r}`);
  pbVal.value = { formula: `IF(C${annSavRow}>0,C${prismCostRow}/C${annSavRow}*12,0)` };
  pbVal.numFmt = '#,##0.0" months"';
  pbVal.font = { bold: true, size: 14, color: { argb: `FF${BRAND_BLUE}` } };
  pbVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${RESULT_GREEN}` } };
  pbVal.border = thinBorder;
  r += 2;

  // Pricing note
  ws1.getCell(`A${r}`).value = "PRISM Pricing Tiers:";
  ws1.getCell(`A${r}`).font = { bold: true, size: 10, color: { argb: `FF${BRAND_BLUE}` } };
  r++;
  ws1.mergeCells(`A${r}:C${r}`);
  ws1.getCell(`A${r}`).value = "1-25 contractors: £199/month  |  26-100: £399/month  |  101-250: £699/month  |  251+: £999/month";
  ws1.getCell(`A${r}`).font = { size: 9, color: { argb: "FF666666" } };
  r++;
  ws1.mergeCells(`A${r}:C${r}`);
  ws1.getCell(`A${r}`).value = "All prices exclude VAT. Contact sales@prlsitesolutions.co.uk for enterprise pricing.";
  ws1.getCell(`A${r}`).font = { size: 9, italic: true, color: { argb: "FF999999" } };

  // Print setup
  ws1.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // ═══════════════════════════════════════════════════════════════════════════
  // Sheet 2: Pricing Comparison
  // ═══════════════════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet("Pricing Comparison", {
    properties: { tabColor: { argb: "FF005F8C" } },
  });

  ws2.columns = [
    { width: 42 },
    { width: 34 },
    { width: 26 },
    { width: 30 },
    { width: 26 },
  ];

  r = 1;
  ws2.mergeCells(`A${r}:E${r}`);
  ws2.getCell(`A${r}`).value = "PRISM vs Competitors — Feature & Pricing Comparison";
  ws2.getCell(`A${r}`).font = { bold: true, size: 18, color: { argb: `FF${BRAND_BLUE}` } };
  r++;
  ws2.mergeCells(`A${r}:E${r}`);
  ws2.getCell(`A${r}`).value = "See why PRISM is the best value workforce platform for UK recruitment agencies";
  ws2.getCell(`A${r}`).font = { italic: true, size: 11, color: { argb: "FF666666" } };
  r += 2;

  // Headers
  const headers = ["Feature", "PRISM", "Requidex", "Manual (Spreadsheets)", "Generic HR Software"];
  const cols = ["A", "B", "C", "D", "E"];
  cols.forEach((col, i) => {
    const cell = ws2.getCell(`${col}${r}`);
    cell.value = headers[i];
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BRAND_BLUE}` } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
  });
  ws2.getRow(r).height = 28;
  r++;

  // Feature rows
  const features = [
    ["Monthly cost (50 contractors)", "£399/mo", "£800-1,200/mo", "£0 (hidden labour costs)", "£500-1,000/mo"],
    ["Setup cost", "£0", "£2,000-5,000", "£0", "£1,000-3,000"],
    ["Contractor limit", "Unlimited (tiered pricing)", "Per-seat pricing", "N/A (manual)", "Per-seat pricing"],
    ["Compliance module (IR35, right-to-work)", "Yes - full automation", "Basic", "No", "Limited"],
    ["Billing & invoicing module", "Yes - automated with Sage sync", "Yes - basic", "No", "Partial"],
    ["Timesheet module", "Yes - mobile & web", "Yes", "Manual spreadsheets", "Basic"],
    ["Intelligence / AI analytics", "Yes - workforce insights & forecasting", "No", "No", "No"],
    ["ISO 9001:2015 QMS integration", "Yes - built-in document pack", "No", "No", "No"],
    ["Mobile app (PWA)", "Yes - iOS & Android", "Limited", "No", "Varies"],
    ["Sage integration", "Yes - native", "Third-party add-on", "No", "Third-party add-on"],
    ["Custom branding", "Yes - white-label ready", "No", "N/A", "Limited"],
    ["UK bank holidays auto-calculation", "Yes", "No", "Manual", "Varies"],
    ["IR35 determination tools", "Yes - built-in assessment", "Basic checklist", "No", "No"],
    ["Email notifications & alerts", "Yes - branded HTML emails", "Basic", "No", "Basic"],
    ["Onboarding portal", "Yes - self-service", "No", "No", "Limited"],
    ["UK-based support", "Yes - dedicated account manager", "Email only", "N/A", "Varies"],
  ];

  features.forEach((row) => {
    // Feature label
    const fCell = ws2.getCell(`A${r}`);
    fCell.value = row[0];
    fCell.font = { size: 10 };
    fCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT_GREY}` } };
    fCell.border = thinBorder;
    fCell.alignment = { wrapText: true };

    // PRISM column (highlighted)
    const pCell = ws2.getCell(`B${r}`);
    pCell.value = row[1];
    pCell.font = { bold: true, color: { argb: `FF${BRAND_BLUE}` } };
    pCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LIGHT_BLUE}` } };
    pCell.alignment = { horizontal: "center", wrapText: true };
    pCell.border = thinBorder;

    // Competitor columns
    for (let ci = 2; ci <= 4; ci++) {
      const cCell = ws2.getCell(`${cols[ci]}${r}`);
      cCell.value = row[ci];
      cCell.alignment = { horizontal: "center", wrapText: true };
      cCell.border = thinBorder;

      // Red text for "No" or negative values
      const val = row[ci];
      if (val === "No" || val.startsWith("No") || val === "Manual" || val === "Manual spreadsheets") {
        cCell.font = { color: { argb: "FFCC0000" } };
      }
    }
    r++;
  });

  r++;
  ws2.mergeCells(`A${r}:E${r}`);
  ws2.getCell(`A${r}`).value = "Ready to switch? Contact sales@prlsitesolutions.co.uk or visit prism.prlsitesolutions.co.uk";
  ws2.getCell(`A${r}`).font = { bold: true, size: 10, color: { argb: `FF${BRAND_BLUE}` } };

  // Print setup
  ws2.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  // ── Save ──
  const outputPath = path.join(__dirname, "PRISM_ROI_Calculator.xlsx");
  await wb.xlsx.writeFile(outputPath);
  console.log("Created: " + outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
