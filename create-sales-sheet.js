const {
  Document, Packer, Paragraph, TextRun, Footer, AlignmentType,
  BorderStyle, Table, TableRow, TableCell, WidthType, VerticalAlign,
  ShadingType, TableBorders, PageBreakBefore
} = require("docx");
const fs = require("fs");

// Brand colours
const PRIMARY = "005F8C";
const ACCENT = "00A3E0";
const HIGHLIGHT = "F59E0B";
const WHITE = "FFFFFF";
const DARK = "1A1A2E";
const GRAY = "666666";
const LIGHT_BG = "F0F7FB";
const FEATURE_BG1 = "EDF6FB";
const FEATURE_BG2 = "FFF8EB";

// No borders helper
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: { style: BorderStyle.NONE, size: 0 },
  insideVertical: { style: BorderStyle.NONE, size: 0 },
};

// Feature data
const features = [
  {
    emoji: "\u{1F4CB}",
    title: "Contractor Management",
    desc: "Centralised records for 300+ contractors. Onboarding, emergency contacts, IR35 status, assignment history.",
  },
  {
    emoji: "\u{1F6E1}\uFE0F",
    title: "Compliance Engine",
    desc: "Auto-expiry detection, 85% risk scoring, configurable checklists, gap analysis. Never miss a renewal.",
  },
  {
    emoji: "\u{23F1}\uFE0F",
    title: "Smart Timesheets",
    desc: "Contractor self-service via mobile. Auto-overtime, UK bank holidays, weekly grouping, approval chains.",
  },
  {
    emoji: "\u{1F4B0}",
    title: "Automated Billing",
    desc: "Invoice generation from approved timesheets. 3-way matching. Sage export. Spend dashboards.",
  },
  {
    emoji: "\u{1F9E0}",
    title: "Workforce Intelligence",
    desc: "Smart matching, predictive risk, anomaly detection. AI-powered insights without the AI price tag.",
  },
  {
    emoji: "\u2705",
    title: "ISO 9001 QMS",
    desc: "Built-in NCR register, audit management, risk register, management review. Certification-ready.",
  },
];

// Stats
const stats = [
  { value: "320+", label: "Contractors" },
  { value: "12", label: "Companies" },
  { value: "85%", label: "Compliance" },
  { value: "<3s", label: "Load Time" },
  { value: "PWA", label: "Mobile App" },
];

// Pricing
const pricing = [
  { tier: "Starter", price: "\u00A3299/mo" },
  { tier: "Professional", price: "\u00A3599/mo" },
  { tier: "Enterprise", price: "\u00A3999/mo" },
];

// Helper: create a feature cell
function featureCell(feature, bgColor) {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    shading: { type: ShadingType.SOLID, color: bgColor },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
    },
    children: [
      new Paragraph({
        spacing: { after: 40 },
        children: [
          new TextRun({ text: feature.emoji + "  ", size: 24 }),
          new TextRun({ text: feature.title, size: 22, bold: true, color: PRIMARY, font: "Arial" }),
        ],
      }),
      new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: feature.desc, size: 17, color: "444444", font: "Arial" }),
        ],
      }),
    ],
  });
}

// Build feature rows (3 rows, 2 cols)
const featureRows = [];
for (let i = 0; i < 6; i += 2) {
  const bg1 = i % 4 === 0 ? FEATURE_BG1 : FEATURE_BG2;
  const bg2 = i % 4 === 0 ? FEATURE_BG2 : FEATURE_BG1;
  featureRows.push(
    new TableRow({
      children: [featureCell(features[i], bg1), featureCell(features[i + 1], bg2)],
    })
  );
}

// Stats cells
const statCells = stats.map(
  (s) =>
    new TableCell({
      width: { size: 20, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.SOLID, color: PRIMARY },
      margins: { top: 80, bottom: 80, left: 60, right: 60 },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.SINGLE, size: 2, color: ACCENT },
        right: { style: BorderStyle.SINGLE, size: 2, color: ACCENT },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [
            new TextRun({ text: s.value, size: 24, bold: true, color: HIGHLIGHT, font: "Arial" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [
            new TextRun({ text: s.label, size: 15, color: WHITE, font: "Arial" }),
          ],
        }),
      ],
    })
);

// Pricing cells
const pricingCells = pricing.map(
  (p, idx) =>
    new TableCell({
      width: { size: 33, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.SOLID, color: idx === 1 ? ACCENT : LIGHT_BG },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [
            new TextRun({
              text: p.tier,
              size: 18,
              bold: true,
              color: idx === 1 ? WHITE : PRIMARY,
              font: "Arial",
            }),
            new TextRun({
              text: "  from " + p.price,
              size: 18,
              color: idx === 1 ? WHITE : DARK,
              font: "Arial",
            }),
          ],
        }),
      ],
    })
);

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 20 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 500, right: 700, bottom: 400, left: 700 },
        },
      },
      children: [
        // ── HEADER BAR ──
        // Top accent line
        new Paragraph({
          spacing: { after: 0 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 18, color: ACCENT, space: 0 },
          },
          children: [],
        }),

        // PRISM title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 0 },
          children: [
            new TextRun({
              text: "PRISM",
              size: 56,
              bold: true,
              color: PRIMARY,
              font: "Arial",
              characterSpacing: 200,
            }),
          ],
        }),

        // Subtitle
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: "Workforce Intelligence & Compliance Platform",
              size: 22,
              color: ACCENT,
              font: "Arial",
            }),
          ],
        }),

        // By PRL
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "By PRL Site Solutions",
              size: 18,
              color: GRAY,
              font: "Arial",
              italics: true,
            }),
          ],
        }),

        // Divider
        new Paragraph({
          spacing: { after: 80 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: HIGHLIGHT, space: 4 },
          },
          children: [],
        }),

        // ── TAGLINE ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 40, after: 100 },
          children: [
            new TextRun({
              text: "See your workforce clearly.",
              size: 28,
              bold: true,
              italics: true,
              color: PRIMARY,
              font: "Arial",
            }),
          ],
        }),

        // ── VALUE PROPOSITION ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: "PRISM is a purpose-built platform for recruitment agencies managing contractors at scale. ",
              size: 19,
              color: DARK,
              font: "Arial",
            }),
            new TextRun({
              text: "From onboarding and compliance to timesheets and billing, everything in one place. ",
              size: 19,
              color: DARK,
              font: "Arial",
            }),
            new TextRun({
              text: "Replace spreadsheets, reduce risk, and get paid faster.",
              size: 19,
              bold: true,
              color: PRIMARY,
              font: "Arial",
            }),
          ],
        }),

        // Spacer
        new Paragraph({ spacing: { after: 100 }, children: [] }),

        // ── FEATURE GRID (table 3x2) ──
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: featureRows,
        }),

        // Spacer
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // ── KEY STATS BAR ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: "PLATFORM AT A GLANCE",
              size: 18,
              bold: true,
              color: PRIMARY,
              font: "Arial",
              characterSpacing: 100,
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [new TableRow({ children: statCells })],
        }),

        // Spacer
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // ── PRICING STRIP ──
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: "FLEXIBLE PRICING",
              size: 18,
              bold: true,
              color: PRIMARY,
              font: "Arial",
              characterSpacing: 100,
            }),
          ],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: noBorders,
          rows: [new TableRow({ children: pricingCells })],
        }),

        // Spacer
        new Paragraph({ spacing: { after: 120 }, children: [] }),

        // ── CTA ──
        new Paragraph({
          spacing: { after: 0 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 8, color: HIGHLIGHT, space: 6 },
          },
          children: [],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 30 },
          children: [
            new TextRun({
              text: "Book a free demo today",
              size: 28,
              bold: true,
              color: HIGHLIGHT,
              font: "Arial",
            }),
          ],
        }),

        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: "info@prlsitesolutions.co.uk",
              size: 19,
              color: PRIMARY,
              font: "Arial",
              bold: true,
            }),
            new TextRun({ text: "   |   ", size: 19, color: GRAY, font: "Arial" }),
            new TextRun({
              text: "0800 772 3959",
              size: 19,
              color: PRIMARY,
              font: "Arial",
              bold: true,
            }),
            new TextRun({ text: "   |   ", size: 19, color: GRAY, font: "Arial" }),
            new TextRun({
              text: "prlsitesolutions.co.uk",
              size: 19,
              color: PRIMARY,
              font: "Arial",
              bold: true,
            }),
          ],
        }),

        // ── FOOTER ──
        new Paragraph({
          spacing: { before: 80 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 6 },
          },
          children: [],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0 },
          children: [
            new TextRun({
              text: "PRL Site Solutions  |  Recruitment Specialists  |  PRISM Workforce Platform",
              size: 15,
              color: GRAY,
              font: "Arial",
            }),
          ],
        }),
      ],
    },
  ],
});

const outputPath =
  "C:\\Users\\LAPTOP80\\OneDrive - prlsitesolutions.co.uk\\Desktop\\prl_req\\PRISM_Sales_Sheet.docx";

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log("PRISM Sales Sheet created:", outputPath, `(${buffer.length} bytes)`);
});
